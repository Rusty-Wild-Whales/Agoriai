import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Post } from "../types";
import { agoraApi } from "../services/agoraApi";

export function usePosts(filter: string = "all", sortBy: string = "recent") {
  return useQuery<Post[]>({
    queryKey: ["posts", filter, sortBy],
    queryFn: () => agoraApi.getPosts(filter, sortBy),
    placeholderData: (previousData) => previousData,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPost: Partial<Post>) => agoraApi.createPost(newPost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useVotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, value }: { postId: string; value: -1 | 0 | 1 }) =>
      agoraApi.votePost(postId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}
