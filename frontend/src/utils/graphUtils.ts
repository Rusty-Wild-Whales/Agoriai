import type { GraphNode } from "../types";

export function calculateNodeRadius(node: GraphNode): number {
  if (node.type === "company") {
    return Math.max(26, Math.min(46, 26 + node.size * 1.9));
  }
  return Math.max(10, Math.min(22, 10 + node.size * 1.2));
}

export function getNodeColor(node: GraphNode): string {
  return node.type === "company" ? "#f59e0b" : "#4f7cff";
}

export function getEdgeOpacity(weight: number): number {
  return Math.max(0.14, Math.min(0.56, weight * 0.18));
}
