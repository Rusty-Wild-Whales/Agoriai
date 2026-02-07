type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  seed: string;
  size?: AvatarSize;
  imageUrl?: string;
  alt?: string;
  className?: string;
}

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-20 h-20",
};

const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

// Rich, elegant color palettes - 24 distinct options
const colors: ColorPalette[] = [
  // Deep blues
  { primary: "#0f172a", secondary: "#3b82f6", accent: "#93c5fd" },
  { primary: "#1e3a5f", secondary: "#60a5fa", accent: "#bfdbfe" },
  // Forest greens
  { primary: "#14532d", secondary: "#22c55e", accent: "#86efac" },
  { primary: "#064e3b", secondary: "#10b981", accent: "#6ee7b7" },
  // Royal purples
  { primary: "#581c87", secondary: "#a855f7", accent: "#d8b4fe" },
  { primary: "#4a1d96", secondary: "#8b5cf6", accent: "#c4b5fd" },
  // Warm oranges
  { primary: "#7c2d12", secondary: "#f97316", accent: "#fed7aa" },
  { primary: "#92400e", secondary: "#f59e0b", accent: "#fde68a" },
  // Navy gold (brand colors)
  { primary: "#0f172a", secondary: "#f59e0b", accent: "#fcd34d" },
  { primary: "#1e293b", secondary: "#fbbf24", accent: "#fef3c7" },
  // Teals
  { primary: "#134e4a", secondary: "#14b8a6", accent: "#99f6e4" },
  { primary: "#0d4a4a", secondary: "#06b6d4", accent: "#67e8f9" },
  // Rose/Pink
  { primary: "#831843", secondary: "#ec4899", accent: "#fbcfe8" },
  { primary: "#9f1239", secondary: "#f43f5e", accent: "#fecdd3" },
  // Slates
  { primary: "#1e293b", secondary: "#64748b", accent: "#cbd5e1" },
  { primary: "#27272a", secondary: "#71717a", accent: "#d4d4d8" },
  // Limes
  { primary: "#365314", secondary: "#84cc16", accent: "#d9f99d" },
  { primary: "#3f6212", secondary: "#a3e635", accent: "#ecfccb" },
  // Sky blues
  { primary: "#0c4a6e", secondary: "#0ea5e9", accent: "#7dd3fc" },
  { primary: "#075985", secondary: "#38bdf8", accent: "#bae6fd" },
  // Indigos
  { primary: "#312e81", secondary: "#6366f1", accent: "#a5b4fc" },
  { primary: "#3730a3", secondary: "#818cf8", accent: "#c7d2fe" },
  // Amber browns
  { primary: "#451a03", secondary: "#d97706", accent: "#fcd34d" },
  { primary: "#78350f", secondary: "#b45309", accent: "#fde68a" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Generate abstract geometric patterns - 24 unique patterns
function generatePattern(hash: number, size: number, palette: ColorPalette): React.ReactNode {
  const patternType = hash % 24;
  const rotation = (hash % 4) * 90;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  switch (patternType) {
    case 0: // Concentric circles
      return (
        <>
          <circle cx={cx} cy={cy} r={r * 1.1} fill={palette.secondary} opacity="0.25" />
          <circle cx={cx} cy={cy} r={r * 0.7} fill={palette.secondary} opacity="0.45" />
          <circle cx={cx} cy={cy} r={r * 0.35} fill={palette.accent} />
        </>
      );

    case 1: // Offset circles
      return (
        <>
          <circle cx={cx * 0.8} cy={cy * 0.8} r={r * 0.9} fill={palette.secondary} opacity="0.35" />
          <circle cx={cx * 1.15} cy={cy * 1.15} r={r * 0.6} fill={palette.accent} opacity="0.6" />
          <circle cx={cx * 0.9} cy={cy * 0.9} r={r * 0.3} fill={palette.accent} />
        </>
      );

    case 2: // Geometric wedge
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <path
            d={`M ${cx} ${cy} L ${cx + r} ${cy - r * 0.5} A ${r} ${r} 0 0 1 ${cx + r} ${cy + r * 0.5} Z`}
            fill={palette.secondary}
            opacity="0.5"
          />
          <circle cx={cx} cy={cy} r={r * 0.3} fill={palette.accent} />
        </g>
      );

    case 3: // Overlapping circles
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <circle cx={cx - r * 0.35} cy={cy} r={r * 0.65} fill={palette.secondary} opacity="0.4" />
          <circle cx={cx + r * 0.35} cy={cy} r={r * 0.65} fill={palette.accent} opacity="0.5" />
        </g>
      );

    case 4: // Diamond
      return (
        <g transform={`rotate(45, ${cx}, ${cy})`}>
          <rect x={cx - r * 0.75} y={cy - r * 0.75} width={r * 1.5} height={r * 1.5} fill={palette.secondary} opacity="0.3" rx="3" />
          <rect x={cx - r * 0.4} y={cy - r * 0.4} width={r * 0.8} height={r * 0.8} fill={palette.accent} opacity="0.7" rx="2" />
        </g>
      );

    case 5: // Wave pattern
      return (
        <>
          <ellipse cx={cx} cy={cy + r * 0.25} rx={r * 0.95} ry={r * 0.5} fill={palette.secondary} opacity="0.3" />
          <ellipse cx={cx} cy={cy} rx={r * 0.7} ry={r * 0.35} fill={palette.secondary} opacity="0.5" />
          <ellipse cx={cx} cy={cy - r * 0.25} rx={r * 0.4} ry={r * 0.2} fill={palette.accent} />
        </>
      );

    case 6: // Horizontal lines
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <line x1={cx - r} y1={cy - r * 0.5} x2={cx + r} y2={cy - r * 0.5} stroke={palette.secondary} strokeWidth={r * 0.18} strokeLinecap="round" opacity="0.35" />
          <line x1={cx - r * 0.7} y1={cy} x2={cx + r * 0.7} y2={cy} stroke={palette.accent} strokeWidth={r * 0.22} strokeLinecap="round" opacity="0.7" />
          <line x1={cx - r * 0.4} y1={cy + r * 0.5} x2={cx + r * 0.4} y2={cy + r * 0.5} stroke={palette.accent} strokeWidth={r * 0.14} strokeLinecap="round" />
        </g>
      );

    case 7: // Crescent
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <circle cx={cx} cy={cy} r={r * 0.85} fill={palette.secondary} opacity="0.45" />
          <circle cx={cx + r * 0.3} cy={cy - r * 0.15} r={r * 0.65} fill={palette.primary} />
          <circle cx={cx - r * 0.25} cy={cy + r * 0.35} r={r * 0.12} fill={palette.accent} />
        </g>
      );

    case 8: // Stacked arcs
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <path d={`M ${cx - r} ${cy + r * 0.3} A ${r} ${r} 0 0 1 ${cx + r} ${cy + r * 0.3}`} fill="none" stroke={palette.secondary} strokeWidth={r * 0.2} opacity="0.35" />
          <path d={`M ${cx - r * 0.7} ${cy} A ${r * 0.7} ${r * 0.7} 0 0 1 ${cx + r * 0.7} ${cy}`} fill="none" stroke={palette.accent} strokeWidth={r * 0.18} opacity="0.65" />
          <path d={`M ${cx - r * 0.4} ${cy - r * 0.3} A ${r * 0.4} ${r * 0.4} 0 0 1 ${cx + r * 0.4} ${cy - r * 0.3}`} fill="none" stroke={palette.accent} strokeWidth={r * 0.14} />
        </g>
      );

    case 9: // Triangle
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <polygon points={`${cx},${cy - r * 0.9} ${cx - r * 0.8},${cy + r * 0.6} ${cx + r * 0.8},${cy + r * 0.6}`} fill={palette.secondary} opacity="0.35" />
          <polygon points={`${cx},${cy - r * 0.5} ${cx - r * 0.45},${cy + r * 0.35} ${cx + r * 0.45},${cy + r * 0.35}`} fill={palette.accent} opacity="0.7" />
        </g>
      );

    case 10: // Hexagon
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <polygon points={`${cx},${cy - r} ${cx + r * 0.87},${cy - r * 0.5} ${cx + r * 0.87},${cy + r * 0.5} ${cx},${cy + r} ${cx - r * 0.87},${cy + r * 0.5} ${cx - r * 0.87},${cy - r * 0.5}`} fill={palette.secondary} opacity="0.35" />
          <circle cx={cx} cy={cy} r={r * 0.4} fill={palette.accent} />
        </g>
      );

    case 11: // Split diagonal
      return (
        <g>
          <path d={`M 0,0 L ${size},0 L ${size},${size} Z`} fill={palette.secondary} opacity="0.3" />
          <circle cx={cx * 0.65} cy={cy * 1.35} r={r * 0.35} fill={palette.accent} />
        </g>
      );

    case 12: // Dots grid
      return (
        <>
          <circle cx={cx - r * 0.55} cy={cy - r * 0.55} r={r * 0.25} fill={palette.secondary} opacity="0.4" />
          <circle cx={cx + r * 0.55} cy={cy - r * 0.55} r={r * 0.25} fill={palette.secondary} opacity="0.4" />
          <circle cx={cx - r * 0.55} cy={cy + r * 0.55} r={r * 0.25} fill={palette.secondary} opacity="0.4" />
          <circle cx={cx + r * 0.55} cy={cy + r * 0.55} r={r * 0.25} fill={palette.secondary} opacity="0.4" />
          <circle cx={cx} cy={cy} r={r * 0.35} fill={palette.accent} />
        </>
      );

    case 13: // Ring
      return (
        <>
          <circle cx={cx} cy={cy} r={r * 0.95} fill="none" stroke={palette.secondary} strokeWidth={r * 0.25} opacity="0.4" />
          <circle cx={cx} cy={cy} r={r * 0.4} fill={palette.accent} />
        </>
      );

    case 14: // Spiral hint
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <path d={`M ${cx} ${cy} Q ${cx + r} ${cy - r * 0.5}, ${cx + r * 0.3} ${cy - r * 0.8}`} fill="none" stroke={palette.secondary} strokeWidth={r * 0.2} strokeLinecap="round" opacity="0.5" />
          <path d={`M ${cx} ${cy} Q ${cx - r * 0.5} ${cy + r}, ${cx - r * 0.8} ${cy + r * 0.3}`} fill="none" stroke={palette.accent} strokeWidth={r * 0.15} strokeLinecap="round" opacity="0.7" />
          <circle cx={cx} cy={cy} r={r * 0.2} fill={palette.accent} />
        </g>
      );

    case 15: // Yin yang inspired
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <path d={`M ${cx} ${cy - r * 0.9} A ${r * 0.9} ${r * 0.9} 0 0 1 ${cx} ${cy + r * 0.9} A ${r * 0.45} ${r * 0.45} 0 0 0 ${cx} ${cy} A ${r * 0.45} ${r * 0.45} 0 0 1 ${cx} ${cy - r * 0.9}`} fill={palette.secondary} opacity="0.4" />
          <circle cx={cx} cy={cy - r * 0.45} r={r * 0.15} fill={palette.accent} />
          <circle cx={cx} cy={cy + r * 0.45} r={r * 0.15} fill={palette.secondary} opacity="0.6" />
        </g>
      );

    case 16: // Corner accent
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <circle cx={cx} cy={cy} r={r * 0.9} fill={palette.secondary} opacity="0.25" />
          <path d={`M ${cx + r * 0.2} ${cy - r * 0.9} Q ${cx + r * 0.9} ${cy - r * 0.9}, ${cx + r * 0.9} ${cy - r * 0.2}`} fill="none" stroke={palette.accent} strokeWidth={r * 0.25} strokeLinecap="round" />
        </g>
      );

    case 17: // Layered squares
      return (
        <g transform={`rotate(${rotation + 15}, ${cx}, ${cy})`}>
          <rect x={cx - r * 0.8} y={cy - r * 0.8} width={r * 1.6} height={r * 1.6} fill={palette.secondary} opacity="0.25" rx="4" />
          <rect x={cx - r * 0.5} y={cy - r * 0.5} width={r} height={r} fill={palette.secondary} opacity="0.4" rx="3" transform={`rotate(15, ${cx}, ${cy})`} />
          <rect x={cx - r * 0.25} y={cy - r * 0.25} width={r * 0.5} height={r * 0.5} fill={palette.accent} rx="2" transform={`rotate(30, ${cx}, ${cy})`} />
        </g>
      );

    case 18: // Flower pattern
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <circle
              key={i}
              cx={cx + Math.cos((angle * Math.PI) / 180) * r * 0.5}
              cy={cy + Math.sin((angle * Math.PI) / 180) * r * 0.5}
              r={r * 0.3}
              fill={i % 2 === 0 ? palette.secondary : palette.accent}
              opacity={i % 2 === 0 ? 0.35 : 0.5}
            />
          ))}
          <circle cx={cx} cy={cy} r={r * 0.25} fill={palette.accent} />
        </g>
      );

    case 19: // Gradient bars
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <rect x={cx - r} y={cy - r * 0.8} width={r * 0.35} height={r * 1.6} fill={palette.secondary} opacity="0.3" rx="2" />
          <rect x={cx - r * 0.35} y={cy - r * 0.6} width={r * 0.35} height={r * 1.2} fill={palette.secondary} opacity="0.5" rx="2" />
          <rect x={cx + r * 0.15} y={cy - r * 0.4} width={r * 0.35} height={r * 0.8} fill={palette.accent} opacity="0.7" rx="2" />
          <rect x={cx + r * 0.65} y={cy - r * 0.2} width={r * 0.35} height={r * 0.4} fill={palette.accent} rx="2" />
        </g>
      );

    case 20: // Nested triangles
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <polygon points={`${cx},${cy - r * 0.95} ${cx - r * 0.85},${cy + r * 0.65} ${cx + r * 0.85},${cy + r * 0.65}`} fill="none" stroke={palette.secondary} strokeWidth={r * 0.1} opacity="0.35" />
          <polygon points={`${cx},${cy - r * 0.55} ${cx - r * 0.5},${cy + r * 0.4} ${cx + r * 0.5},${cy + r * 0.4}`} fill={palette.secondary} opacity="0.4" />
          <polygon points={`${cx},${cy - r * 0.25} ${cx - r * 0.22},${cy + r * 0.18} ${cx + r * 0.22},${cy + r * 0.18}`} fill={palette.accent} />
        </g>
      );

    case 21: // Bokeh circles
      return (
        <>
          <circle cx={cx - r * 0.4} cy={cy - r * 0.3} r={r * 0.5} fill={palette.secondary} opacity="0.3" />
          <circle cx={cx + r * 0.5} cy={cy - r * 0.1} r={r * 0.4} fill={palette.secondary} opacity="0.4" />
          <circle cx={cx - r * 0.1} cy={cy + r * 0.5} r={r * 0.45} fill={palette.accent} opacity="0.5" />
          <circle cx={cx + r * 0.2} cy={cy + r * 0.1} r={r * 0.25} fill={palette.accent} opacity="0.8" />
        </>
      );

    case 22: // Cross
      return (
        <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
          <rect x={cx - r * 0.2} y={cy - r * 0.9} width={r * 0.4} height={r * 1.8} fill={palette.secondary} opacity="0.4" rx="3" />
          <rect x={cx - r * 0.9} y={cy - r * 0.2} width={r * 1.8} height={r * 0.4} fill={palette.secondary} opacity="0.4" rx="3" />
          <circle cx={cx} cy={cy} r={r * 0.3} fill={palette.accent} />
        </g>
      );

    case 23: // Saturn rings
    default:
      return (
        <g transform={`rotate(${rotation + 20}, ${cx}, ${cy})`}>
          <ellipse cx={cx} cy={cy} rx={r * 0.95} ry={r * 0.3} fill="none" stroke={palette.secondary} strokeWidth={r * 0.12} opacity="0.4" />
          <circle cx={cx} cy={cy} r={r * 0.45} fill={palette.secondary} opacity="0.5" />
          <circle cx={cx} cy={cy} r={r * 0.25} fill={palette.accent} />
        </g>
      );
  }
}

export function Avatar({
  seed,
  size = "md",
  imageUrl,
  alt = "Avatar",
  className = "",
}: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }

  const hash = hashString(seed);
  const colorPalette = colors[hash % colors.length];
  const px = sizePx[size];

  return (
    <div
      className={`rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}
      role="img"
      aria-label={alt}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={px} height={px} fill={colorPalette.primary} />
        {generatePattern(hash, px, colorPalette)}
      </svg>
    </div>
  );
}
