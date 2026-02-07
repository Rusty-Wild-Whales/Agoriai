import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  header,
  footer,
  className = "",
  hoverable = false,
  onClick,
}: CardProps) {
  const Comp = hoverable ? motion.div : "div";
  const hoverProps = hoverable
    ? { whileHover: { y: -2, boxShadow: "0 14px 28px rgba(15,23,42,0.12)" } }
    : {};

  return (
    <Comp
      className={`mosaic-surface-strong rounded-2xl transition-all ${onClick ? "cursor-pointer mosaic-hover" : ""} ${className}`}
      onClick={onClick}
      {...hoverProps}
    >
      {header && (
        <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-700/70">{header}</div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-slate-200/70 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-800 rounded-b-2xl">
          {footer}
        </div>
      )}
    </Comp>
  );
}
