"use client";

import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  text: string;
  className?: string;
}

export function MathRenderer({ text, className = "" }: MathRendererProps) {
  if (!text) return null;

  // Split the text by math block delimiters ($$...$$) and inline delimiters ($...$)
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const formula = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="block my-3 overflow-x-auto text-center py-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            console.error("KaTeX displayMode error:", e);
            return <code key={index}>{part}</code>;
          }
        } else if (part.startsWith("$") && part.endsWith("$")) {
          const formula = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="inline-block px-1 align-middle"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            console.error("KaTeX inlineMode error:", e);
            return <code key={index}>{part}</code>;
          }
        }
        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
      })}
    </span>
  );
}
