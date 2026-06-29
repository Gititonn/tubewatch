"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p style={{ marginBottom: "0.75em", lineHeight: 1.7 }}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: "#fff", fontWeight: 700 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ color: "#ccc" }}>{children}</em>
          ),
          ul: ({ children }) => (
            <ul style={{ paddingLeft: "1.25em", marginBottom: "0.75em", listStyleType: "disc" }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: "1.25em", marginBottom: "0.75em", listStyleType: "decimal" }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: "0.25em", lineHeight: 1.6 }}>{children}</li>
          ),
          h1: ({ children }) => (
            <h1 style={{ color: "#fff", fontWeight: 800, fontSize: "1.1em", marginBottom: "0.5em" }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: "1em", marginBottom: "0.4em" }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ color: "#ddd", fontWeight: 600, fontSize: "0.95em", marginBottom: "0.4em" }}>{children}</h3>
          ),
          code: ({ children }) => (
            <code style={{ background: "#1a1a1a", padding: "0.1em 0.4em", borderRadius: "4px", fontSize: "0.85em", color: "#00ff87" }}>{children}</code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
