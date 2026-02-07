import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Eye, AlertCircle, UserCheck, Sparkles } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { mockApi } from "../services/mockApi";
import { formatDate } from "../utils/helpers";
import type { Conversation, Message } from "../types";

// System message for identity reveal
interface SystemMessage {
  id: string;
  type: "identity-reveal";
  userId: string;
  userName: string;
  createdAt: string;
}

type ChatMessage = Message | SystemMessage;

function isSystemMessage(msg: ChatMessage): msg is SystemMessage {
  return "type" in msg && msg.type === "identity-reveal";
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revealedIdentities, setRevealedIdentities] = useState<Record<string, { name: string; timestamp: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = "u1";
  const currentUserRealName = "Alex Chen"; // Mock real name for current user

  useEffect(() => {
    mockApi.getConversations().then((data) => {
      setConversations(data);
      if (data.length > 0) setActiveConvId(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    mockApi.getMessages(activeConvId).then((msgs) => {
      // Check if there's a revealed identity for this conversation
      const revealInfo = revealedIdentities[activeConvId];
      if (revealInfo) {
        // Insert system message after appropriate timestamp
        const chatMessages: ChatMessage[] = [...msgs];
        const systemMsg: SystemMessage = {
          id: `sys-${activeConvId}`,
          type: "identity-reveal",
          userId: currentUserId,
          userName: revealInfo.name,
          createdAt: revealInfo.timestamp,
        };

        // Find where to insert based on timestamp
        const insertIndex = chatMessages.findIndex(
          (m) => new Date(m.createdAt) > new Date(revealInfo.timestamp)
        );
        if (insertIndex === -1) {
          chatMessages.push(systemMsg);
        } else {
          chatMessages.splice(insertIndex, 0, systemMsg);
        }
        setMessages(chatMessages);
      } else {
        setMessages(msgs);
      }
    });
  }, [activeConvId, revealedIdentities]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const otherParticipant = activeConv?.participants.find(
    (p) => p.userId !== currentUserId
  );

  // Check if current user has revealed identity in this conversation
  const hasRevealedIdentity = activeConvId ? !!revealedIdentities[activeConvId] : false;

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

  const handleRevealIdentity = () => {
    if (!activeConvId) return;

    // Store the reveal
    const timestamp = new Date().toISOString();
    setRevealedIdentities((prev) => ({
      ...prev,
      [activeConvId]: { name: currentUserRealName, timestamp },
    }));

    // Add system message to current messages
    const systemMsg: SystemMessage = {
      id: `sys-${Date.now()}`,
      type: "identity-reveal",
      userId: currentUserId,
      userName: currentUserRealName,
      createdAt: timestamp,
    };
    setMessages((prev) => [...prev, systemMsg]);

    setShowRevealModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <p className="text-neutral-400">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* Conversation List */}
      <div className="w-80 border-r border-neutral-200 dark:border-neutral-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="font-display font-semibold text-primary-900 dark:text-white">
            Messages
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => {
            const other = conv.participants.find(
              (p) => p.userId !== currentUserId
            );
            const isActive = conv.id === activeConvId;
            const isRevealed = revealedIdentities[conv.id];
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors cursor-pointer ${
                  isActive ? "bg-primary-50 dark:bg-primary-900/30" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <div className="relative">
                  <Avatar seed={other?.alias || "unknown"} size="md" />
                  {isRevealed && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <UserCheck size={10} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-900 dark:text-white truncate">
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
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    seed={otherParticipant?.alias || "unknown"}
                    size="md"
                  />
                </div>
                <div>
                  <p className="font-medium text-primary-900 dark:text-white">
                    {otherParticipant?.alias}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {otherParticipant?.isAnonymous
                      ? "Anonymous"
                      : "Identity revealed"}
                  </p>
                </div>
              </div>
              {!hasRevealedIdentity ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRevealModal(true)}
                >
                  <Eye size={14} /> Reveal Identity
                </Button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
                  <UserCheck size={14} />
                  <span>Identity Revealed</span>
                </div>
              )}
            </div>

            {/* Anonymous banner */}
            {otherParticipant?.isAnonymous && !hasRevealedIdentity && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/30 text-xs text-primary-700 dark:text-primary-300">
                <AlertCircle size={14} />
                You are both anonymous in this conversation. You can choose to
                reveal your identity at any time.
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                // System message for identity reveal
                if (isSystemMessage(msg)) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex justify-center my-4"
                    >
                      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800 rounded-full">
                        <Sparkles size={14} className="text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-700 dark:text-green-400">
                          <span className="font-semibold">{msg.userName}</span> revealed their identity
                        </span>
                        <span className="text-xs text-green-500 dark:text-green-500">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    </motion.div>
                  );
                }

                const isMine = msg.senderId === currentUserId;
                // Show real name if identity was revealed before this message
                const revealInfo = activeConvId ? revealedIdentities[activeConvId] : null;
                const showRealName = isMine && revealInfo && new Date(msg.createdAt) >= new Date(revealInfo.timestamp);

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex items-end gap-2 max-w-[70%]">
                      {!isMine && (
                        <Avatar seed={msg.senderAlias} size="sm" />
                      )}
                      <div>
                        {/* Show sender name with identity indicator */}
                        <p className={`text-xs mb-1 ${isMine ? "text-right" : "text-left"} text-neutral-400`}>
                          {isMine ? (
                            showRealName ? (
                              <span className="flex items-center gap-1 justify-end">
                                <UserCheck size={10} className="text-green-500" />
                                {currentUserRealName}
                              </span>
                            ) : (
                              msg.senderAlias
                            )
                          ) : (
                            msg.senderAlias
                          )}
                        </p>
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm ${
                            isMine
                              ? "bg-primary-900 dark:bg-primary-700 text-white rounded-br-md"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-md"
                          }`}
                        >
                          <p>{msg.content}</p>
                        </div>
                        <p
                          className={`text-xs mt-1 ${isMine ? "text-right text-primary-300" : "text-neutral-400"}`}
                        >
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                      {isMine && (
                        <Avatar
                          seed={showRealName ? currentUserRealName : msg.senderAlias}
                          size="sm"
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
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
          <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
              <Eye size={24} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                This action cannot be undone
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {otherParticipant?.alias} will see your real name
              </p>
            </div>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Once you reveal your identity, <span className="font-medium">{otherParticipant?.alias}</span> will see
            your real name: <span className="font-semibold text-primary-900 dark:text-white">{currentUserRealName}</span>.
          </p>

          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            This is a meaningful moment. Only reveal when you feel genuine trust
            has been established.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowRevealModal(false)}
            >
              Keep Anonymous
            </Button>
            <Button onClick={handleRevealIdentity}>
              <UserCheck size={14} /> Reveal Identity
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
