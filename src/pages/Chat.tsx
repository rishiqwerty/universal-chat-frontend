import { useCallback, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createConversation, updateConversationTitle, getRecentConversations, getConversationDetails, getConversationMessages, sendMessageStream, type Conversation } from "../api/api";
import ChatWindow, { type ChatMessage } from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import WelcomeScreen from "../components/WelcomeScreen";

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

  useEffect(() => {
    getRecentConversations()
      .then((chats) => setRecentChats(chats))
      .catch(() => {});
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    localStorage.removeItem("activeChatId");
    setActiveChatTitle("Untitled Chat");
    setMessages([]);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const [details, msgs] = await Promise.all([
        getConversationDetails(id),
        getConversationMessages(id),
      ]);
      setActiveChatId(details.id);
      localStorage.setItem("activeChatId", details.id);
      setActiveChatTitle(details.title);
      // Map server roles down to valid UI Chat window roles
      const formatted: ChatMessage[] = msgs.map((m) => ({
        id: m.id,
        role: m.role === "system" ? "assistant" : m.role,
        content: m.content,
      }));
      setMessages(formatted);
    } catch {
      console.error("Failed to load chat history");
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
        
        getRecentConversations(true).then((chats) => setRecentChats(chats)).catch(() => {});
      } catch (e) {
        console.error("Failed to create chat");
        setStreamError("Failed to create conversation.");
        setLastFailedText(text);
        setPending(false);
        return;
      }
    }

    const assistantMsgId = `a-${Date.now()}`;
    setMessages((m) => [...m, { id: assistantMsgId, role: "assistant", content: "" }]);

    try {
      await sendMessageStream(currentChatId, text, (chunk) => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: msg.content + chunk } : msg
          )
        );
      });
    } catch (e) {
      console.error("Failed to stream response");
      // Remove the empty assistant bubble
      setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
      setStreamError("Failed to get a response. Please try again.");
      setLastFailedText(text);
    } finally {
      setPending(false);
    }
  }, [pending, activeChatId, activeChatTitle]);

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

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <Sidebar activeNav="chat" onNewChat={handleNewChat} onSelectChat={loadConversation} recentChats={recentChats} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar activeChatTitle={activeChatTitle} onUpdateTitle={handleUpdateTitle} />

        {isEmpty ? (
          /* Welcome layout — everything centered as one block */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-background px-6">
            <WelcomeScreen />
            <div className="mt-8 w-full max-w-2xl">
              <MessageInput value={draft} onChange={setDraft} onSend={send} disabled={pending} />
            </div>
          </div>
        ) : (
          /* Normal chat layout */
          <>
            <ChatWindow messages={messages} />
            {streamError && (
              <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-6 py-3">
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
              </div>
            )}
            <MessageInput value={draft} onChange={setDraft} onSend={send} disabled={pending} />
          </>
        )}
      </div>
    </div>
  );
}
