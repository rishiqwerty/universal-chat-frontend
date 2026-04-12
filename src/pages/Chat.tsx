import { useCallback, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createConversation, updateConversationTitle, getRecentConversations, getConversationDetails, getConversationMessages, sendMessageStream, type Conversation } from "../api/api";
import ChatWindow, { type ChatMessage } from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const initialMessages: ChatMessage[] = [];

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  
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

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending) return;
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
      console.error("Failed to stream stream");
    } finally {
      setPending(false);
    }
  }, [draft, pending, activeChatId, activeChatTitle]);

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <Sidebar activeNav="chat" onNewChat={handleNewChat} onSelectChat={loadConversation} recentChats={recentChats} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar activeChatTitle={activeChatTitle} onUpdateTitle={handleUpdateTitle} />
        <ChatWindow messages={messages} />
        <MessageInput value={draft} onChange={setDraft} onSend={send} disabled={pending} />
      </div>
    </div>
  );
}
