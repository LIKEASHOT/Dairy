import React from 'react';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and plain text.
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex splitting by bold (**...**), italic (*...*), or code (`...`)
  const parts = text.split(/(\*\*.*?\*\*|\*[^*]+?\*|`[^`]+?`)/g);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-[#2C2723]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[#F3EBDD]/90 text-[#8C6C26] font-mono text-[11px] border border-[#E8DFD1]/70"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-[#58544E]">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Plain text
    return <span key={index}>{part}</span>;
  });
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className={`space-y-2 text-xs leading-relaxed text-[#38332B] font-sans select-text ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Horizontal Rule
        if (/^---+$/.test(trimmed)) {
          return <hr key={idx} className="my-3 border-t border-[#E8DFD1]" />;
        }

        // H1 Heading (# Title)
        if (line.startsWith('# ')) {
          return (
            <div key={idx} className="pb-2 mb-2 border-b border-[#E8DFD1]">
              <h1 className="text-sm font-bold text-[#2C2723] tracking-tight">
                {renderInline(line.slice(2))}
              </h1>
            </div>
          );
        }

        // H2 Heading (## Title)
        if (line.startsWith('## ')) {
          return (
            <div key={idx} className="pt-2 pb-1 border-b border-[#F0E9DF]">
              <h2 className="text-xs font-bold text-[#2C2723] tracking-tight">
                {renderInline(line.slice(3))}
              </h2>
            </div>
          );
        }

        // H3 Section Heading (### Title)
        if (line.startsWith('### ')) {
          return (
            <div
              key={idx}
              className="mt-4 mb-2 p-2.5 bg-[#FAF0ED]/70 rounded-xl border border-[#F0D5CD] flex items-center space-x-2"
            >
              <h3 className="text-xs font-bold text-[#A45842] tracking-wide">
                {renderInline(line.slice(4))}
              </h3>
            </div>
          );
        }

        // H4 Heading (#### Title)
        if (line.startsWith('#### ')) {
          return (
            <h4 key={idx} className="text-xs font-semibold text-[#38332B] pt-2 pb-0.5">
              {renderInline(line.slice(5))}
            </h4>
          );
        }

        // Blockquote (> Quote)
        if (line.startsWith('>')) {
          const quoteText = line.replace(/^>\s*/, '');
          return (
            <blockquote
              key={idx}
              className="pl-3 py-1 my-1.5 border-l-2 border-[#C97B63] bg-[#FAF0ED]/40 text-[#58544E] text-xs italic rounded-r"
            >
              {renderInline(quoteText)}
            </blockquote>
          );
        }

        // Nested Sub-bullet (2+ spaces followed by - or *)
        if (/^\s{2,}[-*]\s(.*)/.test(line)) {
          const match = line.match(/^\s{2,}[-*]\s(.*)/);
          const itemText = match ? match[1] : line;
          return (
            <div key={idx} className="ml-5 flex items-start space-x-2 my-1 text-xs text-[#4A453E] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9EAD90] mt-1.5 shrink-0" />
              <div className="flex-1">{renderInline(itemText)}</div>
            </div>
          );
        }

        // Top-level bullet item (- item or * item)
        if (/^[-*]\s(.*)/.test(line)) {
          const match = line.match(/^[-*]\s(.*)/);
          const itemText = match ? match[1] : line;
          return (
            <div key={idx} className="flex items-start space-x-2 mt-2 mb-1 text-xs text-[#2C2723] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C97B63] mt-1.5 shrink-0" />
              <div className="flex-1 font-medium">{renderInline(itemText)}</div>
            </div>
          );
        }

        // Numbered list item (1. item, 2. item)
        if (/^(\d+)\.\s(.*)/.test(line)) {
          const match = line.match(/^(\d+)\.\s(.*)/);
          const num = match ? match[1] : '1';
          const itemText = match ? match[2] : line;
          return (
            <div key={idx} className="flex items-start space-x-2 my-1.5 text-xs text-[#38332B] leading-relaxed">
              <span className="w-4 h-4 rounded-full bg-[#FAF0ED] text-[#C97B63] border border-[#F0D5CD] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {num}
              </span>
              <div className="flex-1">{renderInline(itemText)}</div>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="my-1.5 text-xs text-[#38332B] leading-relaxed">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
};
