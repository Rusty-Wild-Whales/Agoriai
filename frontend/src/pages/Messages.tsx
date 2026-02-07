import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Eye, AlertCircle, UserCheck, Sparkles } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { agoraApi } from "../services/agoraApi";
import { formatDate } from "../utils/helpers";
import type { Conversation, Message } from "../types";
import { useAuthStore } from "../stores/authStore";

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
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const conversationFromQuery = searchParams.get("conversation");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(user?.id));
  const [sendError, setSendError] = useState<string | null>(null);
  const [revealedIdentities, setRevealedIdentities] = useState<
    Record<string, { name: string; timestamp: string }>
  >({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id;
  const currentUserRealName = user?.realName ?? user?.anonAlias ?? "Anonymous";

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    void agoraApi
      .getConversations()
      .then((data) => {
        if (cancelled) return;
        setConversations(data);
        if (data.length > 0) {
          if (conversationFromQuery && data.some((conversation) => conversation.id === conversationFromQuery)) {
            setActiveConvId(conversationFromQuery);
          } else {
            setActiveConvId((prev) => prev ?? data[0].id);
          }
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load conversations", error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, conversationFromQuery]);

  useEffect(() => {
    if (!activeConvId || !currentUserId) return;

    let cancelled = false;

    void agoraApi
      .getMessages(activeConvId)
      .then((msgs) => {
        if (cancelled) return;

        const revealInfo = revealedIdentities[activeConvId];
        if (!revealInfo) {
          setMessages(msgs);
          return;
        }

        const chatMessages: ChatMessage[] = [...msgs];
        const systemMsg: SystemMessage = {
          id: `sys-${activeConvId}`,
          type: "identity-reveal",
          userId: currentUserId,
          userName: revealInfo.name,
          createdAt: revealInfo.timestamp,
        };

        const insertIndex = chatMessages.findIndex(
          (message) => new Date(message.createdAt) > new Date(revealInfo.timestamp)
        );

        if (insertIndex === -1) {
          chatMessages.push(systemMsg);
        } else {
          chatMessages.splice(insertIndex, 0, systemMsg);
        }

        setMessages(chatMessages);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load messages", error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConvId, revealedIdentities, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = conversations.find((conv) => conv.id === activeConvId);
  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [conversations]
  );

  const otherParticipant = activeConv?.participants.find((p) => p.userId !== currentUserId);
  const hasRevealedIdentity = activeConvId ? Boolean(revealedIdentities[activeConvId]) : false;

  const handleSend = async () => {
    if (!currentUserId) return;
    const trimmed = newMessage.trim();
    if (!trimmed || !activeConvId) return;

    setSendError(null);
    try {
      const msg = await agoraApi.sendMessage(activeConvId, {
        content: trimmed,
      });
      setMessages((prev) => [...prev, msg]);

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConvId
            ? {
                ...conv,
                lastMessage: msg,
                updatedAt: msg.createdAt,
              }
            : conv
        )
      );

      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message", error);
      setSendError(error instanceof Error ? error.message : "Unable to send message.");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleRevealIdentity = () => {
    if (!activeConvId || !currentUserId) return;

    const timestamp = new Date().toISOString();

    setRevealedIdentities((prev) => ({
      ...prev,
      [activeConvId]: { name: currentUserRealName, timestamp },
    }));

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
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Loading conversations...</p>
      </div>
    );
  }

  if (!user?.id) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-slate-600 dark:text-slate-300">You need to sign in to view messages.</p>
      </div>
    );
  }

  return (
    <div
      data-tutorial="messages-panel"
      className="mosaic-surface-strong flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl"
    >
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200/80 dark:border-slate-700/70">
        <div className="border-b border-slate-200/80 p-4 dark:border-slate-700/70">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sortedConversations.map((conv) => {
            const other = conv.participants.find((p) => p.userId !== currentUserId);
            const isActive = conv.id === activeConvId;
            const isRevealed = Boolean(revealedIdentities[conv.id]);

            return (
              <button
                key={conv.id}
                onClick={() => {
                  setSendError(null);
                  setActiveConvId(conv.id);
                }}
                className={`mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                  isActive
                    ? "bg-slate-100 dark:bg-slate-800/70"
                    : "hover:bg-slate-100/80 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="relative">
                  <Avatar seed={other?.alias || "unknown"} size="md" />
                  {isRevealed && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                      <UserCheck size={10} className="text-white" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {other?.alias || "Unknown"}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {conv.lastMessage?.content}
                  </p>
                </div>

                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ""}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section data-tutorial="messages-chat" className="flex min-w-0 flex-1 flex-col">
        {activeConv ? (
          <>
            <header className="flex items-center justify-between border-b border-slate-200/80 p-4 dark:border-slate-700/70">
              <div className="flex items-center gap-3">
                <Avatar seed={otherParticipant?.alias || "unknown"} size="md" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{otherParticipant?.alias}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {otherParticipant?.isAnonymous ? "Anonymous" : "Identity revealed"}
                  </p>
                </div>
              </div>

              {!hasRevealedIdentity ? (
                <Button variant="ghost" size="sm" onClick={() => setShowRevealModal(true)}>
                  <Eye size={14} />
                  Reveal Identity
                </Button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <UserCheck size={14} />
                  Identity Revealed
                </div>
              )}
            </header>

            {otherParticipant?.isAnonymous && !hasRevealedIdentity && (
              <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/40 dark:text-slate-300">
                <AlertCircle size={14} />
                You are both anonymous. Reveal only when trust is established.
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message) => {
                if (isSystemMessage(message)) {
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="my-4 flex justify-center"
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <Sparkles size={14} />
                        <span>
                          <span className="font-semibold">{message.userName}</span> revealed their identity
                        </span>
                        <span className="text-xs opacity-80">{formatDate(message.createdAt)}</span>
                      </div>
                    </motion.div>
                  );
                }

                const isMine = message.senderId === currentUserId;
                const revealInfo = activeConvId ? revealedIdentities[activeConvId] : null;
                const showRealName =
                  isMine &&
                  revealInfo &&
                  new Date(message.createdAt) >= new Date(revealInfo.timestamp);

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className="flex max-w-[72%] items-end gap-2">
                      {!isMine && <Avatar seed={message.senderAlias} size="sm" />}

                      <div>
                        <p
                          className={`mb-1 text-xs text-slate-500 dark:text-slate-400 ${
                            isMine ? "text-right" : "text-left"
                          }`}
                        >
                          {isMine ? (
                            showRealName ? (
                              <span className="inline-flex items-center gap-1">
                                <UserCheck size={10} className="text-emerald-500" />
                                {currentUserRealName}
                              </span>
                            ) : (
                              message.senderAlias
                            )
                          ) : (
                            message.senderAlias
                          )}
                        </p>

                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm ${
                            isMine
                              ? "rounded-br-md bg-amber-500 text-slate-900"
                              : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {message.content}
                        </div>

                        <p
                          className={`mt-1 text-xs text-slate-500 dark:text-slate-400 ${
                            isMine ? "text-right" : "text-left"
                          }`}
                        >
                          {formatDate(message.createdAt)}
                        </p>
                      </div>

                      {isMine && (
                        <Avatar
                          seed={showRealName ? currentUserRealName : message.senderAlias}
                          size="sm"
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-slate-200/80 p-4 dark:border-slate-700/70">
              {sendError && (
                <p className="mb-2 rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  {sendError}
                </p>
              )}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="h-10 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                />
                <Button onClick={handleSend} disabled={!newMessage.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500 dark:text-slate-400">
            Select a conversation
          </div>
        )}
      </section>

      <Modal
        isOpen={showRevealModal}
        onClose={() => setShowRevealModal(false)}
        title="Reveal Your Identity"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
              <Eye size={20} className="text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">This action cannot be undone</p>
              <p className="text-sm text-amber-700/90 dark:text-amber-300/90">
                {otherParticipant?.alias} will see your real name.
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Once revealed, <span className="font-medium">{otherParticipant?.alias}</span> will see your
            name as <span className="font-semibold text-slate-900 dark:text-white">{currentUserRealName}</span>.
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reveal only when trust has been established.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowRevealModal(false)}>
              Keep Anonymous
            </Button>
            <Button onClick={handleRevealIdentity}>
              <UserCheck size={14} />
              Reveal Identity
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
