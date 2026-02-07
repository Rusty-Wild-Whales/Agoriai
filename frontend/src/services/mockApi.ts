import {
  mockPosts,
  mockUsers,
  mockCompanies,
  mockGraphData,
  mockConversations,
  mockMessages,
  mockComments,
} from "../mocks/data";
import type { Post, Company, GraphData, User, Comment, Conversation, Message } from "../types";

function delay(ms: number = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockApi = {
  getPosts: async (filter?: string): Promise<Post[]> => {
    await delay();
    if (filter && filter !== "all") {
      return mockPosts.filter((p) => p.category === filter);
    }
    return mockPosts;
  },

  getPost: async (id: string): Promise<Post | undefined> => {
    await delay();
    return mockPosts.find((p) => p.id === id);
  },

  createPost: async (post: Partial<Post>): Promise<Post> => {
    await delay();
    const newPost: Post = {
      id: `p${Date.now()}`,
      authorId: "u1",
      authorAlias: "StellarPenguin",
      authorAvatarSeed: "seed-alpha",
      category: post.category || "question",
      title: post.title || "",
      content: post.content || "",
      tags: post.tags || [],
      upvotes: 0,
      commentCount: 0,
      isAnonymous: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...post,
    };
    mockPosts.unshift(newPost);
    return newPost;
  },

  upvotePost: async (postId: string): Promise<void> => {
    await delay(100);
    const post = mockPosts.find((p) => p.id === postId);
    if (post) post.upvotes += 1;
  },

  getComments: async (postId: string): Promise<Comment[]> => {
    await delay();
    return mockComments[postId] || [];
  },

  getCompanies: async (): Promise<Company[]> => {
    await delay();
    return mockCompanies;
  },

  getCompany: async (id: string): Promise<Company | undefined> => {
    await delay();
    return mockCompanies.find((c) => c.id === id);
  },

  getUsers: async (): Promise<User[]> => {
    await delay();
    return mockUsers;
  },

  getUser: async (id: string): Promise<User | undefined> => {
    await delay();
    return mockUsers.find((u) => u.id === id);
  },

  getGraphData: async (_filters?: { industry?: string; university?: string }): Promise<GraphData> => {
    await delay(500);
    return mockGraphData;
  },

  getConversations: async (): Promise<Conversation[]> => {
    await delay();
    return mockConversations;
  },

  getMessages: async (conversationId: string): Promise<Message[]> => {
    await delay();
    return mockMessages[conversationId] || [];
  },

  sendMessage: async (conversationId: string, content: string): Promise<Message> => {
    await delay(100);
    const msg: Message = {
      id: `m${Date.now()}`,
      conversationId,
      senderId: "u1",
      senderAlias: "StellarPenguin",
      content,
      createdAt: new Date().toISOString(),
    };
    if (!mockMessages[conversationId]) mockMessages[conversationId] = [];
    mockMessages[conversationId].push(msg);
    return msg;
  },
};
