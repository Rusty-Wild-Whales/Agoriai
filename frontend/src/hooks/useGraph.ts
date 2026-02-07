import { useQuery } from "@tanstack/react-query";
import type { GraphData } from "../types";
import { agoraApi } from "../services/agoraApi";

export function useGraphData(filters?: {
  industry?: string;
  university?: string;
}) {
  return useQuery<GraphData>({
    queryKey: ["graph", filters],
    queryFn: () => agoraApi.getGraphData(filters),
    staleTime: 1000 * 60 * 10,
  });
}
