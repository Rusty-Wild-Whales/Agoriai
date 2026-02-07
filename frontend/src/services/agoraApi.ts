import { api } from "./api";
import type { Comment, Company, Conversation, GraphData, Message, Post, User } from "../types";

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
  getCurrentUser: (userId?: string) => api.get<User>(`/users/me${toQuery({ userId })}`),

  getUser: (id: string) => api.get<User>(`/users/${id}`),

  getUserPosts: (id: string) => api.get<Post[]>(`/users/${id}/posts`),

  getPosts: (filter?: string) => api.get<Post[]>(`/posts${toQuery({ filter })}`),

  getRecentPosts: (limit = 5) => api.get<Post[]>(`/posts/recent${toQuery({ limit })}`),

  getTrendingPosts: (limit = 5) => api.get<Post[]>(`/posts/trending${toQuery({ limit })}`),

  createPost: (post: Partial<Post>) => api.post<Post>("/posts", post),

  upvotePost: (postId: string) => api.post<{ id: string; upvotes: number }>(`/posts/${postId}/upvote`, {}),

  getComments: (postId: string) => api.get<Comment[]>(`/posts/${postId}/comments`),

  createComment: (
    postId: string,
    payload: { content: string; parentCommentId?: string; authorId?: string }
  ) => api.post<Comment>(`/posts/${postId}/comments`, payload),

  getCompanies: () => api.get<Company[]>("/companies"),

  getCompany: (id: string) => api.get<Company>(`/companies/${id}`),

  getCompanyPosts: (id: string) => api.get<Post[]>(`/companies/${id}/posts`),

  getGraphData: (filters?: { industry?: string; university?: string }) =>
    api.get<GraphData>(`/graph${toQuery(filters ?? {})}`),

  getConversations: (userId?: string) =>
    api.get<Conversation[]>(`/conversations${toQuery({ userId })}`),

  getMessages: (conversationId: string) =>
    api.get<Message[]>(`/conversations/${conversationId}/messages`),

  sendMessage: (
    conversationId: string,
    payload: { content: string; senderId?: string }
  ) => api.post<Message>(`/conversations/${conversationId}/messages`, payload),
};
