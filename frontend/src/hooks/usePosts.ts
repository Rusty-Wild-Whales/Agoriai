import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Post } from "../types";
import { mockApi } from "../services/mockApi";

export function usePosts(filter: string = "all") {
  return useQuery<Post[]>({
    queryKey: ["posts", filter],
    queryFn: () => mockApi.getPosts(filter),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPost: Partial<Post>) => mockApi.createPost(newPost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useUpvotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => mockApi.upvotePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
