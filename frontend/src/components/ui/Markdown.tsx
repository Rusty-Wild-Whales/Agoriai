import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  content: string;
  className?: string;
}

function MarkdownBase({ content, className = "" }: MarkdownProps) {
  return (
    <div className={`max-w-none space-y-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_pre]:my-2 [&_pre]:overflow-x-auto ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              className="text-amber-600 underline decoration-amber-500/50 underline-offset-2 hover:text-amber-500 dark:text-amber-400"
              target="_blank"
              rel="noreferrer"
            />
          ),
          code: ({ className: codeClass, children, ...props }) => {
            const inline = !codeClass;
            if (inline) {
              return (
                <code
                  {...props}
                  className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  {children}
                </code>
              );
            }

            return (
              <code
                {...props}
                className="block overflow-x-auto rounded-lg bg-slate-100 p-3 text-[0.85em] text-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownBase);
