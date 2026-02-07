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

// More sophisticated, classy adjectives - avoiding playful/cute words
const adjectives = [
  "Aureate", "Meridian", "Verdant", "Argent", "Obsidian", "Cerulean", "Ember",
  "Granite", "Ivory", "Opal", "Onyx", "Scarlet", "Cobalt", "Sepia", "Slate",
  "Copper", "Bronze", "Indigo", "Crimson", "Ochre", "Amber", "Sable",
  "Lunar", "Solar", "Astral", "Arctic", "Alpine", "Boreal", "Cardinal",
  "Prime", "Noble", "Grand", "Sage", "Elder", "Arch", "Apex", "Crest",
  "Zenith", "Nadir", "Equinox", "Solstice", "Haven", "Vale", "Summit",
];

// More elegant, professional nouns - nature and classical references
const nouns = [
  "Thesis", "Axiom", "Cipher", "Vector", "Nexus", "Vertex", "Radius",
  "Meridian", "Zenith", "Orbit", "Prism", "Index", "Quorum", "Ledger",
  "Archive", "Chronicle", "Scribe", "Scholar", "Consul", "Arbiter",
  "Sentinel", "Warden", "Herald", "Envoy", "Steward", "Rector", "Proctor",
  "Anchor", "Compass", "Horizon", "Latitude", "Longitude", "Equator",
  "Pinnacle", "Citadel", "Bastion", "Paragon", "Vanguard", "Catalyst",
  "Monolith", "Canopy", "Summit", "Harbor", "Beacon", "Constellation",
  "Atlas", "Domain", "Signal", "Current", "Frontier", "Terrace",
  "Keystone", "Facet", "Relic", "Symmetry", "Vault", "Spire",
  "Bridge", "Concord", "Forum", "Emissary", "Framework", "Kernel",
  "Semaphore", "Spectrum", "Nova", "Lattice", "Contour", "Cascade",
  "Aurora", "Archive", "Crescent", "Silhouette", "Grove", "River",
  "Plateau", "Passage", "Avenue", "Portal", "Hearth", "Banyan",
  "Oak", "Pillar", "Gallery", "Mosaic", "Draft", "Canvas",
  "Aperture", "Lantern", "Quasar", "Comet", "Meteor", "Nebula",
  "Vortex", "Harbinger", "Skylight", "Palisade", "Cairn", "Estuary",
  "Meadow", "Elm", "Pioneer", "Waypoint", "Helix", "Matrix",
  "Benchmark", "Blueprint", "Circuit", "Payload", "Foundry", "Anvil",
  "Chisel", "Arsenal", "Repository", "Protocol", "Dispatch", "Cadence",
  "Cadre", "Tribune", "Regent", "Marshal", "Praetor", "Archivist",
  "Talisman", "Runestone", "Glyph", "Epoch", "Eon", "Odyssey",
  "Voyage", "Axis", "Crux", "Emberline", "Northstar", "Ridgeline",
  "Timber", "Shoreline", "Wildwood", "Stonepath", "Windward", "Suncrest",
  "Nightfall", "Daybreak", "Moonrise", "Skystone", "Highland", "Lowland",
  "Outlook", "Promontory", "Drift", "Tide", "Currentline", "Headland",
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

export function generateAnonName(seed: string): string {
  const adjectiveHash = hashSeed(`${seed}:adj`);
  const nounHash = hashSeed(`${seed}:noun:${adjectiveHash}`);
  const adj = adjectives[adjectiveHash % adjectives.length];
  const noun = nouns[nounHash % nouns.length];
  return `${adj}${noun}`;
}

export function hashToHSL(seed: string): { h: number; s: number; l: number } {
  const hash = hashSeed(seed);
  return {
    h: hash % 360,
    s: 50 + ((hash >>> 8) % 30),
    l: 45 + ((hash >>> 16) % 20),
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
