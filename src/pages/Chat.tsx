import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  createConversation,
  updateConversationTitle,
  getRecentConversations,
  getConversations,
  getConversationDetails,
  getConversationMessages,
  starConversation,
  unstarConversation,
  archiveConversation,
  unarchiveConversation,
  sendMessageStream,
  sendTempChatMessageStream,
  deleteConversation,
  deleteMessage,
  getAvailableModels,
  type Conversation,
  type ProviderModels
} from "../api/api";
import { type UnifiedMessage } from "../api/api";
import ChatWindow, { type ChatMessage } from "../components/ChatWindow";
import MessageInput, { type MessageInputHandle } from "../components/MessageInput";
import Sidebar, { type ChatFilterMode } from "../components/Sidebar";
import Topbar from "../components/Topbar";
import WelcomeScreen from "../components/WelcomeScreen";
import ConfirmModal from "../components/ConfirmModal";
import SignupModal from "../components/SignupModal";
import PageTransition from "../components/PageTransition";
import UpgradeFlyer from "../components/UpgradeFlyer";
import { useDocumentSEO } from "../hooks/useDocumentSEO";
import { useAuth } from "../context/AuthContext";

const initialMessages: ChatMessage[] = [];

export default function Chat() {
  useDocumentSEO({
    title: "Chat",
    description: "Communicate with advanced language models and direct neural processes.",
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, isAuthenticating } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [activeChatId, setActiveChatId] = useState<string | null>(
    () => localStorage.getItem("activeChatId")
  );
  const [activeChatTitle, setActiveChatTitle] = useState<string | null>(null);
  const [activeChatMeta, setActiveChatMeta] = useState<Conversation | null>(null);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);
  const [chatFilter, setChatFilter] = useState<ChatFilterMode>("all");

  const [availableModels, setAvailableModels] = useState<ProviderModels[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const [isTempMode, setIsTempMode] = useState(!isAuthenticated);
  const [tempMessages, setTempMessages] = useState<ChatMessage[]>([]);
  const [loadingRecentChats, setLoadingRecentChats] = useState(isAuthenticated);

  const streamControllerRef = useRef<AbortController | null>(null);
  const messageInputRef = useRef<MessageInputHandle>(null);
  const loadedChatIdRef = useRef<string | null>(null);
  const pollCountRef = useRef<number>(0);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [chatIdToDelete, setChatIdToDelete] = useState<string | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [chatIdToArchive, setChatIdToArchive] = useState<string | null>(null);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [showUpgradeFlyer, setShowUpgradeFlyer] = useState(false);
  const [showMcpNotification, setShowMcpNotification] = useState(false);

  useEffect(() => {
    // Detect first-load and pop open notification after delay
    const hasSeen = localStorage.getItem("hasSeenMcpNotification") === "true";
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setShowMcpNotification(true);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissMcpNotification = () => {
    localStorage.setItem("hasSeenMcpNotification", "true");
    setShowMcpNotification(false);
  };

  const cancelActiveStream = useCallback(() => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
      setPending(false);
      setMessages((prev) =>
        prev
          .map((msg, i) =>
            i === prev.length - 1 && msg.role === "assistant" ? { ...msg, isComplete: true } : msg
          )
          .filter((msg) => msg.role !== "assistant" || (msg.content && msg.content.trim() !== "") || (msg.images && msg.images.length > 0))
      );
      setTempMessages((prev) =>
        prev
          .map((msg, i) =>
            i === prev.length - 1 && msg.role === "assistant" ? { ...msg, isComplete: true } : msg
          )
          .filter((msg) => msg.role !== "assistant" || (msg.content && msg.content.trim() !== "") || (msg.images && msg.images.length > 0))
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelActiveStream();
      setTempMessages([]);
      setDraft("");
    };
  }, [cancelActiveStream]);

  // Clean up all conversation and message states when user logs out or resets
  useEffect(() => {
    const handleReset = () => {
      cancelActiveStream();
      setActiveChatId(null);
      setActiveChatTitle("Untitled Chat");
      setActiveChatMeta(null);
      setMessages([]);
      setTempMessages([]);
      setRecentChats([]);
      setDraft("");
      setStreamError(null);
      setIsTempMode(true);
      loadedChatIdRef.current = null;
    };
    window.addEventListener("app:user-logged-out", handleReset);
    window.addEventListener("chat:reset", handleReset);
    return () => {
      window.removeEventListener("app:user-logged-out", handleReset);
      window.removeEventListener("chat:reset", handleReset);
    };
  }, [cancelActiveStream]);

  // Clean up temp chats whenever the route path changes
  useEffect(() => {
    if (isTempMode) {
      setTempMessages([]);
      setDraft("");
    }
  }, [location.pathname, isTempMode]);

  // Auto-refocus input field as soon as AI response finishes generating
  const prevPendingRef = useRef(pending);
  useEffect(() => {
    if (prevPendingRef.current && !pending) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
    prevPendingRef.current = pending;
  }, [pending]);

  // Ensure temp messages are cleared on browser reload / tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTempMode) {
        setTempMessages([]);
        setDraft("");
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isTempMode]);

  const handleNewChat = useCallback(() => {
    loadedChatIdRef.current = null;
    cancelActiveStream();
    setPending(false);

    if (isTempMode) {
      setTempMessages([]);
      setTimeout(() => messageInputRef.current?.focus(), 100);
      return;
    }

    setActiveChatId(null);
    localStorage.removeItem("activeChatId");
    setActiveChatTitle("Untitled Chat");
    setActiveChatMeta(null);
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
  }, [cancelActiveStream, isTempMode]);

  const loadConversation = useCallback(async (id: string) => {
    if (loadedChatIdRef.current === id) return;
    loadedChatIdRef.current = id;

    cancelActiveStream();
    setIsTempMode(false);
    setPending(false);
    setStreamError(null);
    setLoadingHistory(true);
    try {
      const [details, msgs] = await Promise.all([
        getConversationDetails(id),
        getConversationMessages(id),
      ]);
      setActiveChatId(details.id);
      localStorage.setItem("activeChatId", details.id);
      setActiveChatTitle(details.title);
      setActiveChatMeta(details);

      // Sync sidebar title if it changed on backend
      setRecentChats((prev) =>
        prev.map((c) => (c.id === details.id ? { ...c, ...details } : c))
      );

      // Map server roles down to valid UI Chat window roles
      const formatted: ChatMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role === "system" ? "assistant" : (m.role as any),
        content: m.content,
        provider: m.provider,
        model: m.model,
        isComplete: m.is_complete,
        images: m.images,
        provider_metadata: m.provider_metadata,
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
          const savedDefault = localStorage.getItem("saved_default_model_config");
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
    } finally {
      setLoadingHistory(false);
    }
  }, [cancelActiveStream, availableModels]);

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
        images: m.images,
        provider_metadata: m.provider_metadata,
      }));
      setMessages((prev) => {
        // Find our last locally generated assistant message
        const lastLocalAssistant = [...prev].reverse().find(m => m.role === "assistant");

        return formatted.map((newMsg, idx) => {
          // 1. Try exact ID match
          let old = prev.find((p) => p.id === newMsg.id);

          // 2. If no exact match but it's the last assistant message and we're syncing,
          // it might be our temporary ID transitioning to a real one.
          if (!old && newMsg.role === "assistant" && idx === formatted.length - 1 && lastLocalAssistant) {
            old = lastLocalAssistant;
          }

          if (old && old.images?.length && (!newMsg.images || newMsg.images.length === 0)) {
            return { ...newMsg, images: old.images };
          }
          return newMsg;
        });
      });
    } catch {
      console.error("Failed to sync messages");
    }
  }, []);

  useEffect(() => {
    if (location.state?.newChat) {
      navigate(".", { replace: true, state: {} });
      handleNewChat();
    } else if (location.state?.chatId) {
      const targetId = location.state.chatId;
      navigate(".", { replace: true, state: {} });
      if (loadedChatIdRef.current !== targetId) {
        loadConversation(targetId);
      }
    } else if (activeChatId && loadedChatIdRef.current !== activeChatId && !pending) {
      // Restore last conversation on refresh
      loadConversation(activeChatId);
    }
  }, [location.state?.newChat, location.state?.chatId, activeChatId, pending, handleNewChat, loadConversation, navigate]);

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

  const handleToggleStar = useCallback(async (id?: string, currentlyStarred?: boolean) => {
    const targetId = id || activeChatId;
    if (!targetId) return;

    const isCurrentlyStarred = currentlyStarred !== undefined
      ? currentlyStarred
      : activeChatMeta?.id === targetId ? !!activeChatMeta.is_starred : false;

    // Optimistic update
    setRecentChats((prev) =>
      prev.map((c) => (c.id === targetId ? { ...c, is_starred: !isCurrentlyStarred } : c))
    );
    if (activeChatMeta && activeChatMeta.id === targetId) {
      setActiveChatMeta((prev) => (prev ? { ...prev, is_starred: !isCurrentlyStarred } : null));
    }

    try {
      if (isCurrentlyStarred) {
        await unstarConversation(targetId);
      } else {
        await starConversation(targetId);
      }
    } catch (e) {
      console.error("Failed to toggle star", e);
      getConversations({ limit: 50 }).then(setRecentChats).catch(() => { });
    }
  }, [activeChatId, activeChatMeta]);

  const handleToggleArchive = useCallback(async (id?: string, currentlyArchived?: boolean) => {
    const targetId = id || activeChatId;
    if (!targetId) return;

    const isCurrentlyArchived = currentlyArchived !== undefined
      ? currentlyArchived
      : activeChatMeta?.id === targetId ? !!activeChatMeta.is_archived : false;

    // If currently archived, unarchive directly without confirmation hurdle
    if (isCurrentlyArchived) {
      setRecentChats((prev) =>
        prev.map((c) => (c.id === targetId ? { ...c, is_archived: false } : c))
      );
      if (activeChatMeta && activeChatMeta.id === targetId) {
        setActiveChatMeta((prev) => (prev ? { ...prev, is_archived: false } : null));
      }
      try {
        await unarchiveConversation(targetId);
        getConversations({ limit: 50 }).then(setRecentChats).catch(() => { });
      } catch (e) {
        console.error("Failed to unarchive conversation", e);
        getConversations({ limit: 50 }).then(setRecentChats).catch(() => { });
      }
      return;
    }

    // When archiving, prompt confirmation modal
    setChatIdToArchive(targetId);
    setIsArchiveModalOpen(true);
  }, [activeChatId, activeChatMeta]);

  const handleConfirmArchive = useCallback(async () => {
    if (!chatIdToArchive) return;
    const targetId = chatIdToArchive;

    // Optimistic update
    setRecentChats((prev) =>
      prev.map((c) => (c.id === targetId ? { ...c, is_archived: true } : c))
    );
    if (activeChatMeta && activeChatMeta.id === targetId) {
      setActiveChatMeta((prev) => (prev ? { ...prev, is_archived: true } : null));
    }

    try {
      await archiveConversation(targetId);
      getConversations({ limit: 50 }).then(setRecentChats).catch(() => { });
    } catch (e) {
      console.error("Failed to archive conversation", e);
      getConversations({ limit: 50 }).then(setRecentChats).catch(() => { });
    } finally {
      setChatIdToArchive(null);
      setIsArchiveModalOpen(false);
    }
  }, [chatIdToArchive, activeChatMeta]);

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
      getConversations({ limit: 50 })
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

    if (isTempMode) {
      if (!isAuthenticated && tempMessages.length >= 30) {
        setIsSignupModalOpen(true);
        return;
      }
      setTempMessages((m) => [...m, userMsg]);
    } else {
      setMessages((m) => [...m, userMsg]);
    }

    setDraft("");
    setPending(true);

    if (isTempMode) {
      // Temporary mode logic: use shared system endpoint
      const assistantMsgId = `a-${Date.now()}`;
      setTempMessages((m) => [...m, { id: assistantMsgId, role: "assistant", content: "", isComplete: false }]);

      const controller = new AbortController();
      streamControllerRef.current = controller;

      try {
        // Prepare context
        const context: UnifiedMessage[] = [...tempMessages, userMsg].map(m => ({
          role: m.role,
          content: m.content
        }));

        let accumulated = "";
        await sendTempChatMessageStream(
          context,
          (chunk) => {
            accumulated += chunk;

            // Check for image markers
            const markerStart = "__IMAGE_START__";
            const markerEnd = "__IMAGE_END__";
            const metaStart = "__METADATA_START__";
            const metaEnd = "__METADATA_END__";

            let displayContent = accumulated;
            let foundImages: string[] = [];

            // While there are complete markers, extract them
            while (displayContent.includes(markerStart) && displayContent.includes(markerEnd)) {
              const startIdx = displayContent.indexOf(markerStart);
              const endIdx = displayContent.indexOf(markerEnd) + markerEnd.length;

              const markerPayload = displayContent.substring(startIdx + markerStart.length, endIdx - markerEnd.length);
              try {
                const data = JSON.parse(markerPayload.trim());
                if (data.url) foundImages.push(data.url);
              } catch (e) {
                console.error("Failed to parse image marker", e);
              }

              displayContent = displayContent.substring(0, startIdx) + displayContent.substring(endIdx);
            }

            let parsedMeta: any = null;
            // Also strip metadata markers
            while (displayContent.includes(metaStart) && displayContent.includes(metaEnd)) {
              const startIdx = displayContent.indexOf(metaStart);
              const endIdx = displayContent.indexOf(metaEnd) + metaEnd.length;
              const metaPayload = displayContent.substring(startIdx + metaStart.length, endIdx - metaEnd.length);
              try {
                parsedMeta = JSON.parse(metaPayload.trim());
              } catch (e) {
                console.error("Failed to parse metadata marker", e);
              }
              displayContent = displayContent.substring(0, startIdx) + displayContent.substring(endIdx);
            }

            setTempMessages((m) => m.map(msg =>
              msg.id === assistantMsgId
                ? {
                  ...msg,
                  content: displayContent,
                  images: foundImages.length > 0 ? [...(msg.images || []), ...foundImages] : msg.images,
                  provider: "AI",
                  model: selectedModel || "Fast",
                  provider_metadata: parsedMeta || msg.provider_metadata,
                }
                : msg
            ));
          },
          controller.signal
        );
      } catch (e: any) {
        if (e.name === "AbortError") return;
        setTempMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
        setStreamError(e.message || "Temporary chat failed. Please try again.");
      } finally {
        setPending(false);
        streamControllerRef.current = null;
        setTempMessages((m) =>
          m
            .map((msg) => (msg.id === assistantMsgId ? { ...msg, isComplete: true } : msg))
            .filter((msg) => msg.role !== "assistant" || (msg.content && msg.content.trim() !== "") || (msg.images && msg.images.length > 0))
        );
      }
      return;
    }

    let currentChatId = activeChatId;
    if (!currentChatId) {
      try {
        const conv = await createConversation(activeChatTitle || "Untitled Chat");
        currentChatId = conv.id;
        loadedChatIdRef.current = conv.id;
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
    setMessages((m) => [...m, { id: assistantMsgId, role: "assistant", content: "", isComplete: false }]);

    const controller = new AbortController();
    streamControllerRef.current = controller;

    let accumulatedChunks = "";
    let hasError = false;
    try {
      await sendMessageStream(
        currentChatId,
        text,
        selectedProvider,
        selectedModel,
        (chunk) => {
          accumulatedChunks += chunk;

          // Check for image markers
          const markerStart = "__IMAGE_START__";
          const markerEnd = "__IMAGE_END__";
          const metaStart = "__METADATA_START__";
          const metaEnd = "__METADATA_END__";

          let displayContent = accumulatedChunks;
          let foundImages: string[] = [];
          let parsedMeta: any = null;

          // While there are complete image markers, extract them
          while (displayContent.includes(markerStart) && displayContent.includes(markerEnd)) {
            const startIdx = displayContent.indexOf(markerStart);
            const endIdx = displayContent.indexOf(markerEnd) + markerEnd.length;

            const markerPayload = displayContent.substring(startIdx + markerStart.length, endIdx - markerEnd.length);
            try {
              const data = JSON.parse(markerPayload.trim());
              if (data.url) foundImages.push(data.url);
            } catch (e) {
              console.error("Failed to parse image marker", e);
            }

            displayContent = displayContent.substring(0, startIdx) + displayContent.substring(endIdx);
          }

          // Parse metadata markers (usage, etc.)
          while (displayContent.includes(metaStart) && displayContent.includes(metaEnd)) {
            const startIdx = displayContent.indexOf(metaStart);
            const endIdx = displayContent.indexOf(metaEnd) + metaEnd.length;

            const metaPayload = displayContent.substring(startIdx + metaStart.length, endIdx - metaEnd.length);
            try {
              parsedMeta = JSON.parse(metaPayload.trim());
            } catch (e) {
              console.error("Failed to parse metadata marker", e);
            }

            displayContent = displayContent.substring(0, startIdx) + displayContent.substring(endIdx);
          }

          setMessages((m) =>
            m.map((msg) => {
              if (msg.id !== assistantMsgId) return msg;

              return {
                ...msg,
                content: displayContent.trim() === "" ? "" : displayContent,
                images: foundImages.length > 0 ? foundImages : msg.images,
                provider: selectedProvider,
                model: selectedModel,
                provider_metadata: parsedMeta || msg.provider_metadata,
              };
            })
          );
        },
        controller.signal
      );
    } catch (e: any) {
      if (e.name === "AbortError") {
        console.log("Stream aborted");
        return;
      }
      hasError = true;
      console.error("Failed to stream response", e);
      // Remove the empty assistant bubble
      setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
      setStreamError(e.message || "Please try again.");
      setLastFailedText(text);
    } finally {
      if (streamControllerRef.current === controller) {
        streamControllerRef.current = null;
        setPending(false);

        // Mark the assistant message as complete in local state and clean up if empty
        setMessages((m) =>
          m
            .map((msg) => (msg.id === assistantMsgId ? { ...msg, isComplete: true } : msg))
            .filter((msg) => msg.role !== "assistant" || (msg.content && msg.content.trim() !== "") || (msg.images && msg.images.length > 0))
        );

        // ONLY sync if no error occurred. Syncing on error causes the 
        // failed message (which isn't in DB yet) to be overwritten by stale state.
        if (currentChatId && !hasError) {
          syncMessages(currentChatId);

          // Refresh sidebar to catch auto-generated title from backend
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
  }, [pending, isTempMode, tempMessages, activeChatId, activeChatTitle, cancelActiveStream, selectedProvider, selectedModel, syncMessages]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(text);
  }, [draft, sendMessage]);

  const handleRetry = useCallback(() => {
    if (!lastFailedText) return;
    // Remove the last user message so sendMessage re-adds it
    if (isTempMode) {
      setTempMessages((m) => m.slice(0, -1));
    } else {
      setMessages((m) => m.slice(0, -1));
    }
    setStreamError(null);
    sendMessage(lastFailedText);
  }, [isTempMode, lastFailedText, sendMessage]);

  const lastMessage = messages[messages.length - 1];
  const isProcessing = useMemo(() => {
    if (pending) return true;
    if (!lastMessage) return false;
    return lastMessage.role === "assistant" && lastMessage.isComplete === false;
  }, [pending, lastMessage]);

  useEffect(() => {
    if (!activeChatId || !isProcessing || pending) {
      pollCountRef.current = 0;
      return;
    }

    const interval = setInterval(() => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 6) {
        // Cap polling after 30 seconds and mark complete locally
        setMessages((prev) =>
          prev.map((msg, idx) =>
            idx === prev.length - 1 && msg.role === "assistant" ? { ...msg, isComplete: true } : msg
          )
        );
        clearInterval(interval);
        return;
      }
      syncMessages(activeChatId);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeChatId, isProcessing, pending, syncMessages]);

  useEffect(() => {
    setIsTempMode(!isAuthenticated);
    if (!isAuthenticated) {
      setActiveChatId(null);
      setActiveChatTitle("Untitled Chat");
      setActiveChatMeta(null);
      setMessages([]);
      setTempMessages([]);
      setRecentChats([]);
      setLoadingRecentChats(false);
      setLoadingModels(false);
      loadedChatIdRef.current = null;
      return;
    }

    // When logging in / switching users:
    setMessages([]);
    setLoadingRecentChats(true);
    getConversations({ limit: 50 })
      .then((chats) => {
        setRecentChats(chats);
        // Only keep activeChatId if it exists in the new user's chat list
        const savedChatId = localStorage.getItem("activeChatId");
        if (savedChatId && chats.some((c) => c.id === savedChatId)) {
          setActiveChatId(savedChatId);
        } else {
          setActiveChatId(null);
          localStorage.removeItem("activeChatId");
          setActiveChatTitle("Untitled Chat");
          setActiveChatMeta(null);
          setMessages([]);
        }
      })
      .catch(() => { })
      .finally(() => setLoadingRecentChats(false));

    setLoadingModels(true);
    getAvailableModels()
      .then((models) => {
        setAvailableModels(models);

        // Set initial selection if none exists
        if (!selectedModel && models.length > 0) {
          const savedDefault = localStorage.getItem("default_model_config");
          if (savedDefault) {
            try {
              const { provider, model } = JSON.parse(savedDefault);
              setSelectedProvider(provider);
              setSelectedModel(model);
            } catch {
              const lastProv = models[models.length - 1];
              const lastMod = lastProv.text_models?.[0] || lastProv.image_models?.[0];
              setSelectedProvider(lastProv.provider);
              setSelectedModel(lastMod || null);
            }
          } else {
            // Default to absolute latest (last provider, first available model)
            const lastProv = models[models.length - 1];
            const lastMod = lastProv.text_models?.[0] || lastProv.image_models?.[0];
            setSelectedProvider(lastProv.provider);
            setSelectedModel(lastMod || null);
          }
        }
      })
      .catch(() => { })
      .finally(() => {
        setLoadingModels(false);
      });
  }, [isAuthenticated, user?.id]);

  const renderChatHistorySkeleton = () => {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            {/* Skeleton bubble 1: User message (Right-aligned) */}
            <div className="flex w-full justify-end">
              <div className="relative overflow-hidden w-2/5 h-10 rounded-card bg-userBubble border border-primary/10">
                <motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
              </div>
            </div>

            {/* Skeleton bubble 2: Assistant message (Left-aligned) */}
            <div className="flex w-full justify-start">
              <div className="relative overflow-hidden w-3/5 rounded-card p-4 bg-surface/30 border border-border/10 backdrop-blur-md">
                <motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                />
                {/* Horizontal skeleton lines */}
                <div className="space-y-2.5">
                  <div className="h-4 w-11/12 rounded bg-elevated/40" />
                  <div className="h-4 w-4/5 rounded bg-elevated/40" />
                  <div className="h-4 w-2/3 rounded bg-elevated/40" />
                </div>
                {/* Avatar/model metadata skeleton indicator */}
                <div className="mt-4 flex items-center gap-2 border-t border-border/10 pt-3">
                  <div className="h-3 w-16 rounded bg-elevated/30" />
                  <div className="h-3 w-24 rounded bg-elevated/30" />
                </div>
              </div>
            </div>

            {/* Skeleton bubble 3: User message (Right-aligned) */}
            <div className="flex w-full justify-end">
              <div className="relative overflow-hidden w-1/3 h-10 rounded-card bg-userBubble border border-primary/10">
                <motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                />
              </div>
            </div>

            {/* Skeleton bubble 4: Assistant message (Left-aligned) */}
            <div className="flex w-full justify-start">
              <div className="relative overflow-hidden w-4/5 rounded-card p-4 bg-surface/30 border border-border/10 backdrop-blur-md">
                <motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                />
                <div className="space-y-2.5">
                  <div className="h-4 w-full rounded bg-elevated/40" />
                  <div className="h-4 w-5/6 rounded bg-elevated/40" />
                  <div className="h-4 w-3/4 rounded bg-elevated/40" />
                  <div className="h-4 w-1/2 rounded bg-elevated/40" />
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-border/10 pt-3">
                  <div className="h-3 w-16 rounded bg-elevated/30" />
                  <div className="h-3 w-24 rounded bg-elevated/30" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const displayedMessages = isTempMode ? tempMessages : messages;
  const isEmpty = displayedMessages.length === 0;

  if (isAuthenticating) {
    return null;
  }

  return (
    <PageTransition>
      <div className="flex h-screen h-[100dvh] min-h-0 overflow-hidden bg-background">
        <Sidebar
          activeNav="chat"
          onNewChat={handleNewChat}
          onSelectChat={loadConversation}
          onDeleteChat={handleDeleteConversation}
          onToggleStar={handleToggleStar}
          onToggleArchive={handleToggleArchive}
          recentChats={recentChats}
          activeChatId={isTempMode ? null : activeChatId}
          isAuthenticated={isAuthenticated}
          isLoadingRecent={loadingRecentChats}
          filterMode={chatFilter}
          onFilterChange={setChatFilter}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar
            activeChatTitle={isTempMode ? "Temporary Chat" : activeChatTitle}
            onUpdateTitle={isTempMode ? undefined : handleUpdateTitle}
            onDeleteChat={(!isTempMode && activeChatId) ? () => handleDeleteConversation() : undefined}
            isStarred={!isTempMode ? !!activeChatMeta?.is_starred : false}
            onToggleStar={(!isTempMode && activeChatId) ? () => handleToggleStar() : undefined}
            isArchived={!isTempMode ? !!activeChatMeta?.is_archived : false}
            onToggleArchive={(!isTempMode && activeChatId) ? () => handleToggleArchive() : undefined}
            isTempMode={isTempMode}
            onToggleTempMode={() => {
              setIsTempMode(!isTempMode);
              handleNewChat();
            }}
            isAuthenticated={isAuthenticated}
            hideIncognito={!isEmpty || loadingHistory}
          />

          <AnimatePresence mode="wait">
            {loadingHistory ? (
              /* Shimmering loading skeleton chat screen */
              <motion.div
                key="loading-history-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                {renderChatHistorySkeleton()}
                <motion.div
                  layoutId="chat-input-container"
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="w-full shrink-0 pt-1 pb-2 sm:pb-3"
                >
                  <div className="mx-auto w-full max-w-4xl px-3 sm:px-6">
                    <MessageInput
                      inputRef={messageInputRef}
                      value={draft}
                      onChange={setDraft}
                      onSend={send}
                      onStop={cancelActiveStream}
                      disabled={true}
                      isStreaming={false}
                      isLoadingModels={!isTempMode && (loadingModels || availableModels.length === 0)}
                      availableModels={availableModels}
                      selectedProvider={selectedProvider}
                      selectedModel={selectedModel}
                      onModelChange={handleModelChange}
                      isTempMode={isTempMode}
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : isEmpty ? (
              /* Welcome layout — everything centered as one block */
              <motion.div
                key="welcome-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background px-6"
              >
                <WelcomeScreen isAuthenticated={isAuthenticated} isTempMode={isTempMode} />
                <motion.div
                  layoutId="chat-input-container"
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="mt-4 sm:mt-6 w-full max-w-2xl"
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
                        {!isTempMode && (
                          <button
                            type="button"
                            onClick={() => messageInputRef.current?.openPicker()}
                            className="flex items-center gap-2 rounded-input border border-border bg-sidebar px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:bg-elevated"
                          >
                            Change Model
                          </button>
                        )}
                      </div>
                    )}
                    {!isTempMode && activeChatMeta?.is_archived ? (
                      <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-surface/90 p-4 sm:p-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all">
                        {/* Ambient radial glow */}
                        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
                        <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 text-center sm:text-left">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-textPrimary tracking-tight">This conversation is archived</h4>
                              <p className="text-xs text-textMuted mt-0.5 leading-relaxed">
                                Messaging is disabled. Would you like to unarchive this chat to send messages?
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleToggleArchive(activeChatId!, true);
                              setTimeout(() => messageInputRef.current?.focus(), 100);
                            }}
                            className="group relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary px-5 py-2.5 text-xs font-bold text-background shadow-[0_0_20px_rgba(217,255,0,0.25)] transition-all hover:bg-primaryHover hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <svg className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                            </svg>
                            <span>Unarchive Chat</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <MessageInput
                        inputRef={messageInputRef}
                        value={draft}
                        onChange={setDraft}
                        onSend={send}
                        onStop={cancelActiveStream}
                        disabled={pending}
                        isStreaming={pending}
                        isLoadingModels={!isTempMode && (loadingModels || availableModels.length === 0)}
                        availableModels={availableModels}
                        selectedProvider={selectedProvider}
                        selectedModel={selectedModel}
                        onModelChange={handleModelChange}
                        isTempMode={isTempMode}
                        showDisclaimer={true}
                      />
                    )}
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

                <ChatWindow messages={displayedMessages} onDeleteMessage={isTempMode ? undefined : handleDeleteMessage} />
                <motion.div
                  layoutId="chat-input-container"
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="w-full shrink-0 pt-1 pb-2 sm:pb-3"
                >
                  <div className="mx-auto w-full max-w-4xl px-3 sm:px-6">
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
                        {!isTempMode && (
                          <button
                            type="button"
                            onClick={() => messageInputRef.current?.openPicker()}
                            className="flex items-center gap-2 rounded-input border border-border bg-sidebar px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:bg-elevated"
                          >
                            Change Model
                          </button>
                        )}
                      </div>
                    )}
                    {!isTempMode && activeChatMeta?.is_archived ? (
                      <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-surface/90 p-4 sm:p-5 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all">
                        {/* Ambient radial glow */}
                        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
                        <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5 text-center sm:text-left">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-textPrimary tracking-tight">This conversation is archived</h4>
                              <p className="text-xs text-textMuted mt-0.5 leading-relaxed">
                                Messaging is disabled. Would you like to unarchive this chat to send messages?
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              handleToggleArchive(activeChatId!, true);
                              setTimeout(() => messageInputRef.current?.focus(), 100);
                            }}
                            className="group relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary px-5 py-2.5 text-xs font-bold text-background shadow-[0_0_20px_rgba(217,255,0,0.25)] transition-all hover:bg-primaryHover hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <svg className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                            </svg>
                            <span>Unarchive Chat</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <MessageInput
                        inputRef={messageInputRef}
                        value={draft}
                        onChange={setDraft}
                        onSend={send}
                        onStop={cancelActiveStream}
                        disabled={pending}
                        isStreaming={pending}
                        isLoadingModels={!isTempMode && (loadingModels || availableModels.length === 0)}
                        availableModels={availableModels}
                        selectedProvider={selectedProvider}
                        selectedModel={selectedModel}
                        onModelChange={handleModelChange}
                        isTempMode={isTempMode}
                      />
                    )}
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

        <ConfirmModal
          isOpen={isArchiveModalOpen}
          onClose={() => {
            setIsArchiveModalOpen(false);
            setChatIdToArchive(null);
          }}
          onConfirm={handleConfirmArchive}
          title="Archive Conversation"
          message="Are you sure you want to archive this conversation? It will be moved to your Archived Chats filter and hidden from your active list."
          confirmText="Archive"
          confirmVariant="primary"
        />

        <SignupModal
          isOpen={isSignupModalOpen}
          onClose={() => setIsSignupModalOpen(false)}
          title="Message Limit Reached"
          subtitle="Create an account to continue chatting"
        />

        <UpgradeFlyer
          isOpen={showUpgradeFlyer}
          onClose={() => {
            setShowUpgradeFlyer(false);
            localStorage.setItem("lastSeenUpgradeFlyer", Date.now().toString());
          }}
        />

        {/* MCP Support Notification Banner */}
        <AnimatePresence>
          {showMcpNotification && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] rounded-card bg-surface/95 backdrop-blur-md p-5 shadow-2xl border border-primary/30 ring-1 ring-black/5"
            >
              <div className="flex gap-3">
                {/* Pulsating notification badge */}
                <div className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-input bg-primary/10 border border-primary/30 text-primary">
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-ping" />
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>

                <div className="flex-1">
                  <h4 className="text-sm font-black text-textPrimary font-headline tracking-wide uppercase">MCP Server Support Live!</h4>
                  <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                    Connect local workflows to Claude Desktop or web platforms like ChatGPT Actions using standard API keys and OAuth 2.0.
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-border/10">
                    <button
                      type="button"
                      onClick={dismissMcpNotification}
                      className="text-xs font-bold text-textMuted hover:text-textPrimary transition-all uppercase tracking-wider"
                    >
                      Maybe Later
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dismissMcpNotification();
                        navigate("/settings?tab=mcp");
                      }}
                      className="px-3.5 py-1.5 rounded-input bg-primary text-black hover:bg-primaryHover text-xs font-black uppercase tracking-wider font-headline shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Configure Now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
