type BadgeVariant = "default" | "accent" | "success" | "warning";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  accent: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400",
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
