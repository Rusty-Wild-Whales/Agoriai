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
    ? { whileHover: { y: -2, boxShadow: "0 8px 25px -5px rgba(0,0,0,0.1)" } }
    : {};

  return (
    <Comp
      className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm transition-shadow ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
      {...hoverProps}
    >
      {header && (
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">{header}</div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 rounded-b-xl">
          {footer}
        </div>
      )}
    </Comp>
  );
}
