import { api } from "./api";
import type {
  AuthResponse,
  Comment,
  Company,
  Conversation,
  GraphData,
  Message,
  Post,
  User,
} from "../types";

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const agoraApi = {
  register: (payload: {
    schoolEmail: string;
    password: string;
    realName?: string;
    university: string;
    graduationYear: number;
    fieldsOfInterest: string[];
    anonAlias: string;
    anonAvatarSeed: string;
  }) => api.post<AuthResponse>("/auth/register", payload),

  login: (payload: { schoolEmail: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", payload),

  logout: () => api.post<{ ok: boolean }>("/auth/logout", {}),

  getCurrentUser: () => api.get<User>("/users/me"),

  getUser: (id: string) => api.get<User>(`/users/${id}`),

  searchUsers: (q?: string, limit = 20) => api.get<User[]>(`/users${toQuery({ q, limit })}`),

  getUserPosts: (id: string) => api.get<Post[]>(`/users/${id}/posts`),

  connectUser: (id: string) =>
    api.post<{ connected: boolean; alreadyConnected: boolean }>(`/users/${id}/connect`, {}),

  getPosts: (filter?: string) => api.get<Post[]>(`/posts${toQuery({ filter })}`),

  getRecentPosts: (limit = 5) => api.get<Post[]>(`/posts/recent${toQuery({ limit })}`),

  getTrendingPosts: (limit = 5) => api.get<Post[]>(`/posts/trending${toQuery({ limit })}`),

  createPost: (post: Partial<Post>) => api.post<Post>("/posts", post),

  upvotePost: (postId: string) => api.post<{ id: string; upvotes: number }>(`/posts/${postId}/upvote`, {}),

  votePost: (postId: string, value: -1 | 0 | 1) =>
    api.post<{ id: string; upvotes: number; userVote: -1 | 0 | 1 }>(`/posts/${postId}/vote`, { value }),

  getComments: (postId: string) => api.get<Comment[]>(`/posts/${postId}/comments`),

  createComment: (
    postId: string,
    payload: { content: string; parentCommentId?: string }
  ) => api.post<Comment>(`/posts/${postId}/comments`, payload),

  voteComment: (commentId: string, value: -1 | 0 | 1) =>
    api.post<{ id: string; upvotes: number; userVote: -1 | 0 | 1 }>(`/comments/${commentId}/vote`, { value }),

  getCompanies: () => api.get<Company[]>("/companies"),

  getCompany: (id: string) => api.get<Company>(`/companies/${id}`),

  getCompanyPosts: (id: string) => api.get<Post[]>(`/companies/${id}/posts`),

  getGraphData: (filters?: { industry?: string; university?: string }) =>
    api.get<GraphData>(`/graph${toQuery(filters ?? {})}`),

  getConversations: () => api.get<Conversation[]>("/conversations"),

  createDirectConversation: (targetUserId: string) =>
    api.post<{ conversationId: string; existing: boolean }>("/conversations/direct", { targetUserId }),

  getMessages: (conversationId: string) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, payload: { content: string }) =>
    api.post<Message>(`/conversations/${conversationId}/messages`, payload),
};
