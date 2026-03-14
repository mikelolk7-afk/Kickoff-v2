"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ChatRoom {
  id: string;
  type: string;
  refId: string | null;
  label: string;
}

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null };
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: roomsData, isLoading: roomsLoading } = useQuery<{
    rooms: ChatRoom[];
  }>({
    queryKey: ["chat-rooms"],
    queryFn: () =>
      fetch("/api/chat?action=rooms").then((r) => r.json()),
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery<{
    messages: ChatMessage[];
  }>({
    queryKey: ["chat-messages", activeRoom?.id],
    queryFn: () =>
      fetch(`/api/chat?roomId=${activeRoom?.id}`).then((r) => r.json()),
    enabled: !!activeRoom,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const sendMut = useMutation({
    mutationFn: (message: string) =>
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          roomId: activeRoom?.id,
          message,
        }),
      }),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", activeRoom?.id],
      });
    },
  });

  const rooms = roomsData?.rooms ?? [];
  const messages = messagesData?.messages ?? [];

  return (
    <div className="p-6 h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>

      <div className="flex gap-4 h-[calc(100%-3rem)]">
        {/* Room List */}
        <div className="w-48 flex-shrink-0 bg-panel rounded-lg border border-gray-800 overflow-y-auto">
          {roomsLoading ? (
            <div className="p-4 text-gray-400 text-sm">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-gray-400 text-sm">No rooms available</div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                  activeRoom?.id === room.id
                    ? "bg-primary/15 text-primary"
                    : "text-gray-300"
                }`}
              >
                {room.label}
              </button>
            ))
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-panel rounded-lg border border-gray-800 flex flex-col">
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a chat room to start
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-800 font-semibold">
                {activeRoom.label}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="text-gray-400 text-sm">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-primary">
                          {msg.user.name ?? "Unknown"}
                        </span>
                        <span className="text-xs text-gray-600">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{msg.body}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newMessage.trim()) {
                    sendMut.mutate(newMessage);
                  }
                }}
                className="p-3 border-t border-gray-800 flex gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={500}
                  className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={sendMut.isPending || !newMessage.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
