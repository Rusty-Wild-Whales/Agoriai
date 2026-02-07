export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const adjectives = [
  "Stellar", "Quiet", "Bright", "Cosmic", "Swift", "Gentle", "Bold",
  "Vivid", "Calm", "Noble", "Lucid", "Keen", "Warm", "Crisp", "Rare",
  "Subtle", "Clever", "Steady", "Radiant", "Serene",
];

const nouns = [
  "Penguin", "Maple", "Lantern", "Falcon", "Cedar", "Prism", "Compass",
  "Harbor", "Quartz", "Orchid", "Ember", "Sage", "Crest", "Drift", "Atlas",
  "Fern", "Summit", "Beacon", "Pixel", "Lotus",
];

export function generateAnonName(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const adj = adjectives[Math.abs(hash) % adjectives.length];
  const noun = nouns[Math.abs(hash >> 8) % nouns.length];
  return `${adj}${noun}`;
}

export function hashToHSL(seed: string): { h: number; s: number; l: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return {
    h: Math.abs(hash) % 360,
    s: 50 + (Math.abs(hash >> 8) % 30),
    l: 45 + (Math.abs(hash >> 16) % 20),
  };
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    "interview-experience": "Interview Experience",
    "internship-review": "Internship Review",
    "career-advice": "Career Advice",
    question: "Question",
    resource: "Resource",
  };
  return labels[category] || category;
}
