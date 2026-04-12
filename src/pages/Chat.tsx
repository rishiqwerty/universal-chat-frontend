import { useCallback, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { mockChatReply, createConversation, updateConversationTitle, getRecentConversations, type Conversation } from "../api/api";
import ChatWindow, { type ChatMessage } from "../components/ChatWindow";
import MessageInput from "../components/MessageInput";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const initialMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    content:
      "Session restored. I am ready to assist with architecture, security reviews, and implementation planning. What should we tackle first?",
  },
  {
    id: "m2",
    role: "user",
    content: "Outline a minimal event-sourcing boundary for order intake.",
  },
  {
    id: "m3",
    role: "assistant",
    content:
      "Start with an append-only event log per aggregate, idempotent command handlers, and snapshots when replay exceeds your latency budget. Keep projections async and version your schemas explicitly.",
  },
];

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatTitle, setActiveChatTitle] = useState<string | null>(null);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);

  useEffect(() => {
    getRecentConversations()
      .then((chats) => setRecentChats(chats))
      .catch(() => {});
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setActiveChatTitle("Untitled Chat");
    setMessages([]);
  }, []);

  useEffect(() => {
    if (location.state?.newChat) {
      handleNewChat();
      navigate(".", { replace: true, state: {} });
    }
  }, [location.state, handleNewChat, navigate]);

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
        setActiveChatTitle(conv.title);
        
        getRecentConversations(true).then((chats) => setRecentChats(chats)).catch(() => {});
      } catch (e) {
        console.error("Failed to create chat");
      }
    }

    const reply = await mockChatReply(text);
    setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: reply }]);
    setPending(false);
  }, [draft, pending, activeChatId, activeChatTitle]);

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <Sidebar activeNav="chat" onNewChat={handleNewChat} recentChats={recentChats} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar activeChatTitle={activeChatTitle} onUpdateTitle={handleUpdateTitle} />
        <ChatWindow messages={messages} />
        <MessageInput value={draft} onChange={setDraft} onSend={send} disabled={pending} />
      </div>
    </div>
  );
}
