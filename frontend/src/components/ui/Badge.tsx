type BadgeVariant = "default" | "accent" | "success" | "warning";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-100/85 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70",
  accent: "bg-amber-100/90 dark:bg-amber-900/35 text-amber-700 dark:text-amber-400 border border-amber-300/70 dark:border-amber-700/40",
  success: "bg-green-50/90 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200/70 dark:border-green-700/40",
  warning: "bg-orange-50/90 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-200/70 dark:border-orange-700/40",
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
