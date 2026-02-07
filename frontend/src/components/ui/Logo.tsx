interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const textSize = sizes[size];

  return (
    <div className={`flex items-center ${className}`}>
      {showText && (
        <span className={`font-display font-bold tracking-tight text-white ${textSize}`}>
          agoriai
        </span>
      )}
    </div>
  );
}

// Simple text-based logo (no icon)
export function LogoIcon({ className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`font-display font-bold text-lg tracking-tight text-amber-500 ${className}`}>
      A
    </span>
  );
}
