import type { GraphNode } from "../types";

type GroupPalette = {
  light: string[];
  dark: string[];
};

const groupPalettes: Record<string, GroupPalette> = {
  tech: {
    light: ["#2563eb", "#3b82f6", "#60a5fa"],
    dark: ["#4f7cff", "#60a5fa", "#7dd3fc"],
  },
  finance: {
    light: ["#059669", "#10b981", "#34d399"],
    dark: ["#22c55e", "#34d399", "#6ee7b7"],
  },
  business: {
    light: ["#d97706", "#f59e0b", "#fb923c"],
    dark: ["#f59e0b", "#fbbf24", "#fdba74"],
  },
  community: {
    light: ["#7c3aed", "#8b5cf6", "#a78bfa"],
    dark: ["#8b5cf6", "#a78bfa", "#c4b5fd"],
  },
};

function normalizedGroup(node: GraphNode) {
  const value = (node.group ?? "community").toLowerCase();
  if (value === "tech" || value === "finance" || value === "business") {
    return value;
  }
  return "community";
}

export function calculateNodeRadius(node: GraphNode): number {
  if (node.type === "company") {
    return Math.max(22, Math.min(42, 22 + node.size * 1.55));
  }
  return Math.max(9, Math.min(18, 9 + node.size * 0.95));
}

export function getNodeColor(node: GraphNode, darkMode = true): string {
  const group = normalizedGroup(node);
  const palette = darkMode ? groupPalettes[group].dark : groupPalettes[group].light;
  const hash = [...node.id].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const offset = node.type === "company" ? 0 : 1;
  return palette[(hash + offset) % palette.length];
}

export function getNodeStrokeColor(node: GraphNode, darkMode = true): string {
  const group = normalizedGroup(node);
  const palette = darkMode ? groupPalettes[group].dark : groupPalettes[group].light;
  const hash = [...node.id].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selected = palette[(hash + 2) % palette.length];
  if (darkMode) {
    return selected;
  }
  return selected;
}

export function getNodeGroupLabel(group?: string): string {
  const normalized = (group ?? "community").toLowerCase();
  if (normalized === "tech") return "Tech";
  if (normalized === "finance") return "Finance";
  if (normalized === "business") return "Business";
  return "Community";
}

export function getEdgeOpacity(weight: number): number {
  return Math.max(0.12, Math.min(0.5, weight * 0.16));
}
