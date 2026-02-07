import { hashToHSL } from "../../utils/helpers";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  seed: string;
  size?: AvatarSize;
  imageUrl?: string;
  alt?: string;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-xl",
};

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

  const color1 = hashToHSL(seed);
  const color2 = hashToHSL(seed + "x");
  const gradient = `linear-gradient(135deg, hsl(${color1.h}, ${color1.s}%, ${color1.l}%), hsl(${color2.h}, ${color2.s}%, ${color2.l}%))`;

  const initial = seed.charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white ${sizeClasses[size]} ${className}`}
      style={{ background: gradient }}
      role="img"
      aria-label={alt}
    >
      {initial}
    </div>
  );
}
