import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Eye, AlertCircle } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { mockApi } from "../services/mockApi";
import { formatDate } from "../utils/helpers";
import type { Conversation, Message } from "../types";

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = "u1";

  useEffect(() => {
    mockApi.getConversations().then((data) => {
      setConversations(data);
      if (data.length > 0) setActiveConvId(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    mockApi.getMessages(activeConvId).then(setMessages);
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const otherParticipant = activeConv?.participants.find(
    (p) => p.userId !== currentUserId
  );

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConvId) return;
    const msg = await mockApi.sendMessage(activeConvId, newMessage);
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <p className="text-neutral-400">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {/* Conversation List */}
      <div className="w-80 border-r border-neutral-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-100">
          <h2 className="font-display font-semibold text-primary-900">
            Messages
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => {
            const other = conv.participants.find(
              (p) => p.userId !== currentUserId
            );
            const isActive = conv.id === activeConvId;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors cursor-pointer ${
                  isActive ? "bg-primary-50" : "hover:bg-neutral-50"
                }`}
              >
                <Avatar seed={other?.alias || "unknown"} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-900 truncate">
                    {other?.alias || "Unknown"}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">
                    {conv.lastMessage?.content}
                  </p>
                </div>
                <span className="text-xs text-neutral-400 shrink-0">
                  {conv.lastMessage
                    ? formatDate(conv.lastMessage.createdAt)
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat View */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <Avatar
                  seed={otherParticipant?.alias || "unknown"}
                  size="md"
                />
                <div>
                  <p className="font-medium text-primary-900">
                    {otherParticipant?.alias}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {otherParticipant?.isAnonymous
                      ? "Anonymous"
                      : "Identity revealed"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRevealModal(true)}
              >
                <Eye size={14} /> Reveal Identity
              </Button>
            </div>

            {/* Anonymous banner */}
            {otherParticipant?.isAnonymous && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-xs text-primary-700">
                <AlertCircle size={14} />
                You are both anonymous in this conversation. You can choose to
                reveal your identity at any time.
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMine
                          ? "bg-primary-900 text-white rounded-br-md"
                          : "bg-neutral-100 text-neutral-900 rounded-bl-md"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${isMine ? "text-primary-300" : "text-neutral-400"}`}
                      >
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-neutral-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
                <Button onClick={handleSend} disabled={!newMessage.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-neutral-400">Select a conversation</p>
          </div>
        )}
      </div>

      {/* Identity Reveal Modal */}
      <Modal
        isOpen={showRevealModal}
        onClose={() => setShowRevealModal(false)}
        title="Reveal Your Identity"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            Once you reveal your identity, {otherParticipant?.alias} will see
            your real name. This cannot be undone for this conversation.
          </p>
          <p className="text-sm text-neutral-500">
            This is a meaningful moment. Only reveal when you feel genuine trust
            has been established.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowRevealModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setShowRevealModal(false)}>
              Reveal Identity
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
