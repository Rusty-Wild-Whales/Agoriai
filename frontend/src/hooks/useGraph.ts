import { useQuery } from "@tanstack/react-query";
import type { GraphData } from "../types";
import { mockApi } from "../services/mockApi";

export function useGraphData(filters?: {
  industry?: string;
  university?: string;
}) {
  return useQuery<GraphData>({
    queryKey: ["graph", filters],
    queryFn: () => mockApi.getGraphData(filters),
    staleTime: 1000 * 60 * 10,
  });
}
