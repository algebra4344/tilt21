"use client";

import { useState, useRef, useEffect } from "react";
import { useGameStore, type ChatMessage } from "@/stores/gameStore";

function MessageItem({ msg }: { msg: ChatMessage }) {
  const isSystem = msg.type === "system";
  return (
    <div
      className={`px-2 py-0.5 text-sm ${
        isSystem ? "text-zinc-500 italic" : "text-zinc-300"
      }`}
    >
      {isSystem ? (
        <span>{msg.text}</span>
      ) : (
        <span>
          <span className="font-semibold text-zinc-200">{msg.username}: </span>
          {msg.text}
        </span>
      )}
    </div>
  );
}

export default function Chat() {
  const messages = useGameStore((s) => s.messages);
  const sendChat = useGameStore((s) => s.sendChat);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendChat(text.slice(0, 200));
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 rounded-xl border border-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Chat
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-0.5">
        {messages.length === 0 && (
          <div className="text-zinc-600 text-sm text-center py-4">No messages yet</div>
        )}
        {messages.map((msg, i) => (
          <MessageItem key={`${msg.timestamp}-${i}`} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 border-t border-zinc-800">
        <div className="flex gap-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            maxLength={200}
            className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-100 text-sm border border-zinc-700 focus:border-amber-500 focus:outline-none placeholder-zinc-500"
          />
          <button
            onClick={handleSend}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
