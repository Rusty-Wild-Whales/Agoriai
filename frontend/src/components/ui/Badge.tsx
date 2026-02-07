type BadgeVariant = "default" | "accent" | "success" | "warning";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
  accent: "bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-400",
  success: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  warning: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
