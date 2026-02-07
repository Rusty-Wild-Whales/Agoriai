import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Eye, Send, Sparkles, UserCheck } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { agoraApi } from "../services/agoraApi";
import { formatDate } from "../utils/helpers";
import type { Conversation, Message } from "../types";
import { useAuthStore } from "../stores/authStore";

export default function Messages() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const conversationFromQuery = searchParams.get("conversation");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(user?.id));
  const [sendError, setSendError] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [processingReveal, setProcessingReveal] = useState(false);
  const [playShatter, setPlayShatter] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.id;
  const currentUserRealName = user?.realName ?? user?.anonAlias ?? "Anonymous";

  const refreshConversations = useCallback(async (preferredConversationId?: string) => {
    const data = await agoraApi.getConversations();
    setConversations(data);
    if (data.length > 0) {
      if (preferredConversationId && data.some((conversation) => conversation.id === preferredConversationId)) {
        setActiveConvId(preferredConversationId);
      } else if (conversationFromQuery && data.some((conversation) => conversation.id === conversationFromQuery)) {
        setActiveConvId(conversationFromQuery);
      } else {
        setActiveConvId((prev) => prev ?? data[0].id);
      }
    }
    return data;
  }, [conversationFromQuery]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);

    void refreshConversations()
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
  }, [user?.id, refreshConversations]);

  useEffect(() => {
    if (!activeConvId || !currentUserId) return;
    let cancelled = false;

    void agoraApi
      .getMessages(activeConvId)
      .then((data) => {
        if (!cancelled) {
          setMessages(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load messages", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeConvId, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConv = conversations.find((conversation) => conversation.id === activeConvId);
  const otherParticipant = activeConv?.participants.find((participant) => participant.userId !== currentUserId);
  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [conversations]
  );

  const handleSend = async () => {
    if (!currentUserId || !activeConvId) return;
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    setSendError(null);
    try {
      const message = await agoraApi.sendMessage(activeConvId, { content: trimmed });
      setMessages((prev) => [...prev, message]);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConvId
            ? {
                ...conversation,
                lastMessage: message,
                updatedAt: message.createdAt,
              }
            : conversation
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

  const handleRequestIdentityReveal = async () => {
    if (!activeConvId) return;
    setRevealError(null);
    setProcessingReveal(true);
    try {
      const response = await agoraApi.requestIdentityReveal(activeConvId);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConvId
            ? {
                ...conversation,
                identity: response.identity,
              }
            : conversation
        )
      );
      setShowRevealModal(false);
      const latestMessages = await agoraApi.getMessages(activeConvId);
      setMessages(latestMessages);
      await refreshConversations(activeConvId);
    } catch (error) {
      setRevealError(error instanceof Error ? error.message : "Failed to request identity reveal.");
    } finally {
      setProcessingReveal(false);
    }
  };

  const handleRespondIdentityReveal = async (accept: boolean) => {
    if (!activeConvId) return;
    setRevealError(null);
    setProcessingReveal(true);
    try {
      const response = await agoraApi.respondIdentityReveal(activeConvId, accept);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeConvId
            ? {
                ...conversation,
                identity: response.identity,
              }
            : conversation
        )
      );
      if (accept) {
        setPlayShatter(true);
        window.setTimeout(() => setPlayShatter(false), 900);
      }
      const latestMessages = await agoraApi.getMessages(activeConvId);
      setMessages(latestMessages);
      await refreshConversations(activeConvId);
    } catch (error) {
      setRevealError(error instanceof Error ? error.message : "Failed to respond to identity request.");
    } finally {
      setProcessingReveal(false);
    }
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
    <div data-tutorial="messages-panel" className="mosaic-surface-strong flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl">
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200/80 dark:border-slate-700/70">
        <div className="border-b border-slate-200/80 p-4 dark:border-slate-700/70">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sortedConversations.map((conversation) => {
            const other = conversation.participants.find((participant) => participant.userId !== currentUserId);
            const isActive = conversation.id === activeConvId;
            const isRevealed = conversation.identity.isRevealed;

            return (
              <button
                key={conversation.id}
                onClick={() => {
                  setSendError(null);
                  setRevealError(null);
                  setActiveConvId(conversation.id);
                }}
                className={`mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                  isActive ? "bg-slate-100 dark:bg-slate-800/70" : "hover:bg-slate-100/80 dark:hover:bg-slate-800/40"
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
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{other?.alias || "Unknown"}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{conversation.lastMessage?.content}</p>
                </div>

                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                  {conversation.lastMessage ? formatDate(conversation.lastMessage.createdAt) : ""}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section data-tutorial="messages-chat" className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <AnimatePresence>
          {playShatter && (
            <motion.div
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="pointer-events-none absolute inset-0 z-30 bg-[linear-gradient(120deg,rgba(255,255,255,0.38),transparent_45%,rgba(255,255,255,0.3))]"
            />
          )}
        </AnimatePresence>

        {activeConv ? (
          <>
            <header className="flex items-center justify-between border-b border-slate-200/80 p-4 dark:border-slate-700/70">
              <div className="flex items-center gap-3">
                <Avatar seed={otherParticipant?.alias || "unknown"} size="md" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{otherParticipant?.alias}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeConv.identity.isRevealed ? "Identity revealed" : "Anonymous chat"}
                  </p>
                </div>
              </div>

              {activeConv.identity.isRevealed ? (
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <UserCheck size={14} />
                  Identity Revealed
                </div>
              ) : activeConv.identity.pendingRequest?.isIncoming ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void handleRespondIdentityReveal(false);
                    }}
                    disabled={processingReveal}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      void handleRespondIdentityReveal(true);
                    }}
                    disabled={processingReveal}
                  >
                    <UserCheck size={14} />
                    Accept Request
                  </Button>
                </div>
              ) : activeConv.identity.pendingRequest ? (
                <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  Identity request sent
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowRevealModal(true)}>
                  <Eye size={14} />
                  Request Identity Reveal
                </Button>
              )}
            </header>

            {!activeConv.identity.isRevealed && (
              <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/40 dark:text-slate-300">
                <AlertCircle size={14} />
                You are both anonymous. Identity reveal requires mutual acceptance.
              </div>
            )}

            {activeConv.identity.pendingRequest?.isIncoming && (
              <div className="border-b border-slate-200/80 bg-amber-50/70 px-4 py-2 text-xs text-amber-800 dark:border-slate-700/70 dark:bg-amber-500/10 dark:text-amber-300">
                {activeConv.identity.pendingRequest.fromAlias} requested to reveal identities.
              </div>
            )}

            {revealError && (
              <div className="border-b border-slate-200/80 px-4 py-2 dark:border-slate-700/70">
                <p className="rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  {revealError}
                </p>
              </div>
            )}

            <div className="flex-1 space-y-1 overflow-y-auto p-4">
              {messages.map((message, index) => {
                const isMine = message.senderId === currentUserId;
                const previous = index > 0 ? messages[index - 1] : null;
                const isText = (message.kind ?? "text") === "text";
                const prevIsText = previous ? (previous.kind ?? "text") === "text" : false;
                const sameSenderCluster =
                  Boolean(previous) &&
                  prevIsText &&
                  isText &&
                  previous?.senderId === message.senderId &&
                  Math.abs(new Date(message.createdAt).getTime() - new Date(previous?.createdAt ?? 0).getTime()) < 180_000;

                if (!isText) {
                  const eventLabel =
                    message.kind === "identity-request"
                      ? `${message.senderAlias} requested identity reveal`
                      : message.kind === "identity-accepted"
                        ? `${message.senderAlias} accepted identity reveal`
                        : `${message.senderAlias} declined identity reveal`;
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="my-3 flex justify-center"
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
                        <Sparkles size={12} />
                        <span>{eventLabel}</span>
                        <span className="opacity-80">{formatDate(message.createdAt)}</span>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex max-w-[72%] items-end gap-2 ${sameSenderCluster ? "mt-0.5" : "mt-2.5"}`}>
                      {!isMine && !sameSenderCluster && <Avatar seed={message.senderAlias} size="sm" />}
                      {!isMine && sameSenderCluster && <div className="w-8" />}

                      <div className="min-w-0">
                        {!sameSenderCluster && (
                          <p className={`mb-0.5 text-[11px] text-slate-500 dark:text-slate-400 ${isMine ? "text-right" : "text-left"}`}>
                            {isMine ? currentUserRealName : message.senderAlias}
                          </p>
                        )}

                        <div
                          className={`inline-block rounded-2xl px-3 py-2 text-sm ${
                            isMine
                              ? "rounded-br-md bg-amber-500 text-slate-900"
                              : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                          }`}
                        >
                          {message.content}
                        </div>

                        {!sameSenderCluster && (
                          <p className={`mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 ${isMine ? "text-right" : "text-left"}`}>
                            {formatDate(message.createdAt)}
                          </p>
                        )}
                      </div>

                      {isMine && !sameSenderCluster && <Avatar seed={message.senderAlias} size="sm" />}
                      {isMine && sameSenderCluster && <div className="w-8" />}
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
          <div className="flex flex-1 items-center justify-center text-slate-500 dark:text-slate-400">Select a conversation</div>
        )}
      </section>

      <Modal isOpen={showRevealModal} onClose={() => setShowRevealModal(false)} title="Request Identity Reveal">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
              <Eye size={20} className="text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Request mutual identity reveal</p>
              <p className="text-sm text-amber-700/90 dark:text-amber-300/90">
                {otherParticipant?.alias} must accept before names are revealed.
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            If accepted, both participants will see real names. Current name on your account:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{currentUserRealName}</span>
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowRevealModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleRequestIdentityReveal();
              }}
              disabled={processingReveal}
            >
              <UserCheck size={14} />
              {processingReveal ? "Requesting..." : "Send Request"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
