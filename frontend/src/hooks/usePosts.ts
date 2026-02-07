import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Post } from "../types";
import { agoraApi } from "../services/agoraApi";

export function usePosts(filter: string = "all") {
  return useQuery<Post[]>({
    queryKey: ["posts", filter],
    queryFn: () => agoraApi.getPosts(filter),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPost: Partial<Post>) => agoraApi.createPost(newPost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpvotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => agoraApi.upvotePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
