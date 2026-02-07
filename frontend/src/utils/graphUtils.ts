import type { GraphNode } from "../types";

export function calculateNodeRadius(node: GraphNode): number {
  if (node.type === "company") {
    return Math.max(30, Math.min(50, 30 + node.size * 2));
  }
  return Math.max(8, Math.min(25, 8 + node.size * 1.5));
}

export function getNodeColor(node: GraphNode): string {
  if (node.type === "company") return "#f59e0b";

  const groupColors: Record<string, string> = {
    engineering: "#3b5898",
    finance: "#16a34a",
    consulting: "#7c3aed",
    design: "#ec4899",
    data: "#06b6d4",
    product: "#f97316",
    default: "#5a7ab8",
  };

  return groupColors[node.group || "default"] || groupColors.default;
}

export function getEdgeOpacity(weight: number): number {
  return Math.max(0.1, Math.min(0.6, weight * 0.15));
}
