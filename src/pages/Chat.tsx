import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createConversation, updateConversationTitle, getRecentConversations, getConversationDetails, getConversationMessages, sendMessageStream, deleteConversation, deleteMessage, getAvailableModels, type Conversation, type ProviderModels } from "../api/api";
import ChatWindow, { type ChatMessage } from "../components/ChatWindow";
import MessageInput, { type MessageInputHandle } from "../components/MessageInput";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import WelcomeScreen from "../components/WelcomeScreen";
import ConfirmModal from "../components/ConfirmModal";
import PageTransition from "../components/PageTransition";

const initialMessages: ChatMessage[] = [];

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);

  const [activeChatId, setActiveChatId] = useState<string | null>(
    () => localStorage.getItem("activeChatId")
  );
  const [activeChatTitle, setActiveChatTitle] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);

  const [availableModels, setAvailableModels] = useState<ProviderModels[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const streamControllerRef = useRef<AbortController | null>(null);
  const messageInputRef = useRef<MessageInputHandle>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatIdToDelete, setChatIdToDelete] = useState<string | null>(null);

  const cancelActiveStream = useCallback(() => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cancelActiveStream();
  }, [cancelActiveStream]);

  const handleNewChat = useCallback(() => {
    if (!activeChatId && messages.length === 0) {
      // Already in a new empty chat, just focus and show glow
      messageInputRef.current?.focus();
      messageInputRef.current?.triggerGlow();
      return;
    }

    cancelActiveStream();
    setPending(false);
    setActiveChatId(null);
    localStorage.removeItem("activeChatId");
    setActiveChatTitle("Untitled Chat");
    setMessages([]);

    // Restore global default for new chat
    const savedDefault = localStorage.getItem("default_model_config");
    if (savedDefault) {
      const { provider, model } = JSON.parse(savedDefault);
      setSelectedProvider(provider);
      setSelectedModel(model);
    }

    // Auto focus new chat
    setTimeout(() => messageInputRef.current?.focus(), 100);
  }, [cancelActiveStream, activeChatId, messages.length]);

  const loadConversation = useCallback(async (id: string) => {
    // Only return early if we already have messages for this chat
    if (id === activeChatId && messages.length > 0) return;

    cancelActiveStream();
    setPending(false);
    setStreamError(null);
    try {
      const [details, msgs] = await Promise.all([
        getConversationDetails(id),
        getConversationMessages(id),
      ]);
      setActiveChatId(details.id);
      localStorage.setItem("activeChatId", details.id);
      setActiveChatTitle(details.title);

      // Sync sidebar title if it changed on backend
      setRecentChats((prev) =>
        prev.map((c) => (c.id === details.id ? { ...c, title: details.title } : c))
      );

      // Map server roles down to valid UI Chat window roles
      const formatted: ChatMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role === "system" ? "assistant" : (m.role as any),
        content: m.content,
        provider: m.provider,
        model: m.model,
        isComplete: m.is_complete,
      }));
      setMessages(formatted);

      // Priority 1: Latest assistant message in history
      const latestAssistantMsg = [...msgs].reverse().find(m => m.role === "assistant" && m.provider && m.model);

      if (latestAssistantMsg) {
        setSelectedProvider(latestAssistantMsg.provider);
        setSelectedModel(latestAssistantMsg.model);
        // Sync to local storage for quick access next time
        localStorage.setItem(`chat_model_config_${id}`, JSON.stringify({
          provider: latestAssistantMsg.provider,
          model: latestAssistantMsg.model
        }));
      } else {
        // Priority 2: Per-chat model config
        const savedChatConfig = localStorage.getItem(`chat_model_config_${id}`);
        if (savedChatConfig) {
          const { provider, model } = JSON.parse(savedChatConfig);
          setSelectedProvider(provider);
          setSelectedModel(model);
        } else {
          // Priority 3: Global default
          const savedDefault = localStorage.getItem("default_model_config");
          if (savedDefault) {
            const { provider, model } = JSON.parse(savedDefault);
            setSelectedProvider(provider);
            setSelectedModel(model);
          } else if (availableModels.length > 0) {
            // Priority 4: Absolute latest from available models
            const lastProv = availableModels[availableModels.length - 1];
            const lastMod = lastProv.text_models?.[0] || lastProv.image_models?.[0];
            setSelectedProvider(lastProv.provider);
            setSelectedModel(lastMod || null);
          }
        }
      }
    } catch {
      console.error("Failed to load chat history");
    }
  }, [cancelActiveStream, activeChatId, messages.length]);

  const syncMessages = useCallback(async (id: string) => {
    try {
      const msgs = await getConversationMessages(id);
      const formatted: ChatMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role === "system" ? "assistant" : (m.role as any),
        content: m.content,
        provider: m.provider,
        model: m.model,
        isComplete: m.is_complete,
      }));
      setMessages(formatted);
    } catch {
      console.error("Failed to sync messages");
    }
  }, []);

  useEffect(() => {
    if (location.state?.newChat) {
      handleNewChat();
      navigate(".", { replace: true, state: {} });
    } else if (location.state?.chatId) {
      loadConversation(location.state.chatId);
      navigate(".", { replace: true, state: {} });
    } else if (activeChatId && messages.length === 0) {
      // Restore last conversation on refresh
      loadConversation(activeChatId);
    }
  }, [location.state, handleNewChat, navigate, loadConversation]);  // activeChatId intentionally excluded to avoid re-trigger

  const handleUpdateTitle = useCallback(async (newTitle: string) => {
    if (!activeChatId) {
      setActiveChatTitle(newTitle);
      return;
    }
    try {
      const conv = await updateConversationTitle(activeChatId, newTitle);
      setActiveChatTitle(conv.title);
      setRecentChats((prev) => prev.map((c) => (c.id === activeChatId ? conv : c)));
    } catch (e) {
      console.error("Failed to update title");
    }
  }, [activeChatId]);

  const handleModelChange = useCallback((provider: string, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);

    const config = JSON.stringify({ provider, model });
    if (activeChatId) {
      localStorage.setItem(`chat_model_config_${activeChatId}`, config);
    } else {
      localStorage.setItem("default_model_config", config);
    }
  }, [activeChatId]);

  const handleDeleteConversation = useCallback(async (id?: string) => {
    const targetId = id || activeChatId;
    if (!targetId) return;
    setChatIdToDelete(targetId);
    setIsDeleteModalOpen(true);
  }, [activeChatId]);

  const handleConfirmDelete = useCallback(async () => {
    if (!chatIdToDelete) return;
    try {
      await deleteConversation(chatIdToDelete);
      getRecentConversations(true)
        .then((chats) => setRecentChats(chats))
        .catch(() => { });

      if (chatIdToDelete === activeChatId) {
        handleNewChat();
      }
    } catch (e) {
      console.error("Failed to delete conversation");
    } finally {
      setChatIdToDelete(null);
    }
  }, [chatIdToDelete, activeChatId, handleNewChat]);

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    if (!activeChatId) return;
    try {
      // Optimistic update
      setMessages((m) => m.filter((msg) => msg.id !== msgId));
      await deleteMessage(activeChatId, msgId);
    } catch (e) {
      console.error("Failed to delete message");
      // Could revert optimistic update here, but let's just log for now
    }
  }, [activeChatId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text || pending) return;
    setStreamError(null);
    setLastFailedText(null);

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setPending(true);

    let currentChatId = activeChatId;
    if (!currentChatId) {
      try {
        const conv = await createConversation(activeChatTitle || "Untitled Chat");
        currentChatId = conv.id;
        setActiveChatId(conv.id);
        localStorage.setItem("activeChatId", conv.id);
        setActiveChatTitle(conv.title);

        // Link the current model to this new chat id
        if (selectedProvider && selectedModel) {
          localStorage.setItem(`chat_model_config_${conv.id}`, JSON.stringify({
            provider: selectedProvider,
            model: selectedModel
          }));
        }

        console.log
        getRecentConversations(true).then((chats) => setRecentChats(chats)).catch(() => { });
      } catch (e) {
        console.error("Failed to create chat");
        setStreamError("Failed to create conversation.");
        setLastFailedText(text);
        setPending(false);
        return;
      }
    }

    if (!selectedProvider || !selectedModel) {
      setStreamError("Please select a model first.");
      setPending(false);
      return;
    }

    const assistantMsgId = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: assistantMsgId, role: "assistant", content: "" }]);

    const controller = new AbortController();
    streamControllerRef.current = controller;

    try {
      await sendMessageStream(
        currentChatId,
        text,
        selectedProvider,
        selectedModel,
        (chunk) => {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + chunk, provider: selectedProvider, model: selectedModel }
                : msg
            )
          );
        },
        controller.signal
      );
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Stream aborted");
        return;
      }
      console.error("Failed to stream response");
      // Remove the empty assistant bubble
      setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
      setStreamError(e.message || "Please try again.");
      setLastFailedText(text);
    } finally {
      if (streamControllerRef.current === controller) {
        streamControllerRef.current = null;
        setPending(false);
        // Silent sync after stream finishes to get real DB IDs (required for deletion)
        // This avoids reloading the whole conversation details/title
        if (currentChatId) {
          syncMessages(currentChatId);

          // Refresh sidebar to catch auto-generated title from backend and update top bar
          getRecentConversations(true)
            .then((chats) => {
              setRecentChats(chats);
              const updated = chats.find(c => c.id === currentChatId);
              if (updated) {
                setActiveChatTitle(updated.title);
              }
            })
            .catch(() => { });
        }
      }
    }
  }, [pending, activeChatId, activeChatTitle, cancelActiveStream, selectedProvider, selectedModel]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(text);
  }, [draft, sendMessage]);

  const handleRetry = useCallback(() => {
    if (!lastFailedText) return;
    // Remove the last user message so sendMessage re-adds it
    setMessages((m) => m.slice(0, -1));
    setStreamError(null);
    sendMessage(lastFailedText);
  }, [lastFailedText, sendMessage]);

  const lastMessage = messages[messages.length - 1];
  const isProcessing = useMemo(() => {
    if (pending) return true;
    if (!lastMessage) return false;
    return lastMessage.role === "assistant" && lastMessage.isComplete === false;
  }, [pending, lastMessage]);

  useEffect(() => {
    if (!activeChatId || !isProcessing || pending) return;

    const interval = setInterval(() => {
      syncMessages(activeChatId);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeChatId, isProcessing, pending, syncMessages]);

  useEffect(() => {
    getRecentConversations(true)
      .then((chats) => setRecentChats(chats))
      .catch(() => { });

    getAvailableModels()
      .then((models) => {
        setAvailableModels(models);
        // Set initial selection if none exists
        if (!selectedModel && models.length > 0) {
          const savedDefault = localStorage.getItem("default_model_config");
          if (savedDefault) {
            const { provider, model } = JSON.parse(savedDefault);
            setSelectedProvider(provider);
            setSelectedModel(model);
          } else {
            // Default to absolute latest (last provider, first available model)
            const lastProv = models[models.length - 1];
            const lastMod = lastProv.text_models?.[0] || lastProv.image_models?.[0];
            setSelectedProvider(lastProv.provider);
            setSelectedModel(lastMod || null);
          }
        }
      })
      .catch(() => { });
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <PageTransition>
      <div className="flex h-screen min-h-0 overflow-hidden bg-background">
        <Sidebar activeNav="chat" onNewChat={handleNewChat} onSelectChat={loadConversation} onDeleteChat={handleDeleteConversation} recentChats={recentChats} activeChatId={activeChatId} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar activeChatTitle={activeChatTitle} onUpdateTitle={handleUpdateTitle} onDeleteChat={activeChatId ? () => handleDeleteConversation() : undefined} />

          <AnimatePresence mode="wait">
            {isEmpty ? (
              /* Welcome layout — everything centered as one block */
              <motion.div
                key="welcome-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background px-6"
              >
                <WelcomeScreen />
                <motion.div
                  layoutId="chat-input-container"
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="mt-8 w-full max-w-2xl"
                >
                  <div className="mx-auto flex w-full flex-col gap-4">
                    {streamError && (
                      <div className="flex items-center gap-3 animate-fade-in">
                        <p className="flex-1 rounded-input bg-primary/10 px-4 py-2 text-sm text-primary ring-1 ring-primary/50">
                          {streamError}
                        </p>
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-semibold text-background shadow-[0_0_12px_rgba(217,255,0,0.2)] transition-colors hover:bg-primaryHover"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M1 4v6h6M23 20v-6h-6" />
                            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                          </svg>
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => messageInputRef.current?.openPicker()}
                          className="flex items-center gap-2 rounded-input border border-border bg-sidebar px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:bg-elevated"
                        >
                          Change Model
                        </button>
                      </div>
                    )}
                    <MessageInput
                      ref={messageInputRef}
                      value={draft}
                      onChange={setDraft}
                      onSend={send}
                      disabled={!!streamError || isProcessing}
                      isStreaming={pending}
                      availableModels={availableModels}
                      selectedProvider={selectedProvider}
                      selectedModel={selectedModel}
                      onModelChange={handleModelChange}
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              /* Normal chat layout */
              <motion.div
                key="chat-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <ChatWindow messages={messages} onDeleteMessage={handleDeleteMessage} />
                <motion.div
                  layoutId="chat-input-container"
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="w-full"
                >
                  <div className="mx-auto w-full max-w-4xl px-6 pb-6 pt-2">
                    {streamError && (
                      <div className="mb-4 flex items-center gap-3 animate-fade-in">
                        <p className="flex-1 rounded-input bg-primary/10 px-4 py-2 text-sm text-primary ring-1 ring-primary/50">
                          {streamError}
                        </p>
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-semibold text-background shadow-[0_0_12px_rgba(217,255,0,0.2)] transition-colors hover:bg-primaryHover"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M1 4v6h6M23 20v-6h-6" />
                            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
                          </svg>
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => messageInputRef.current?.openPicker()}
                          className="flex items-center gap-2 rounded-input border border-border bg-sidebar px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:bg-elevated"
                        >
                          Change Model
                        </button>
                      </div>
                    )}
                    <MessageInput
                      ref={messageInputRef}
                      value={draft}
                      onChange={setDraft}
                      onSend={send}
                      disabled={!!streamError || isProcessing}
                      isStreaming={pending}
                      availableModels={availableModels}
                      selectedProvider={selectedProvider}
                      selectedModel={selectedModel}
                      onModelChange={handleModelChange}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Conversation"
          message="Are you sure you want to delete this conversation? This action cannot be undone and will remove all messages associated with it."
        />
      </div>
    </PageTransition>
  );
}
