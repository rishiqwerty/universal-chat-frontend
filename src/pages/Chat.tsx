import { useCallback, useState } from "react";
import { mockChatReply } from "../api/api";
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
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setPending(true);
    const reply = await mockChatReply(text);
    setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: reply }]);
    setPending(false);
  }, [draft, pending]);

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
      <Sidebar activeNav="chat" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar />
        <ChatWindow messages={messages} />
        <MessageInput value={draft} onChange={setDraft} onSend={send} disabled={pending} />
      </div>
    </div>
  );
}
