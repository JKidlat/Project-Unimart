import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Clean, safe, zero-dependency Markdown renderer for Unimart.
 * Supports headings with auto-generated IDs, styled blockquotes,
 * bullet and numbered lists, inline formatting, tables, and links.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Helper to generate slug for table of contents and anchor linking
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  // Safe link renderer
  const renderInline = (text: string) => {
    // Process bold + italic, bold, italic, inline code, and links
    const parts: (string | React.ReactNode)[] = [];
    
    // Simple inline parser
    // Regex matches [link text](url) or **bold** or *italic* or `code`
    const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('[') && token.includes('](')) {
        const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          const [, linkText, rawUrl] = linkMatch;
          const isExternal = rawUrl.startsWith('http') || rawUrl.startsWith('//');
          parts.push(
            <a
              key={match.index}
              href={rawUrl}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="text-[#a14b58] font-medium underline underline-offset-2 hover:text-[#883d49] transition-colors"
            >
              {linkText}
            </a>
          );
        }
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-semibold text-gray-900 dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic text-gray-700 dark:text-gray-300">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code
            key={match.index}
            className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded border border-gray-200 dark:border-gray-700"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Split content into blocks by double newlines
  const blocks = content.split(/\n{2,}/);

  return (
    <div className={`space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed ${className}`}>
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading 1 (# Heading)
        if (trimmed.startsWith('# ')) {
          const headingText = trimmed.replace(/^#\s+/, '');
          const id = slugify(headingText);
          return (
            <h1
              key={index}
              id={id}
              className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white pt-6 pb-2 border-b border-gray-200 dark:border-gray-800 scroll-mt-24"
            >
              {headingText}
            </h1>
          );
        }

        // Heading 2 (## Heading)
        if (trimmed.startsWith('## ')) {
          const headingText = trimmed.replace(/^##\s+/, '');
          const id = slugify(headingText);
          return (
            <h2
              key={index}
              id={id}
              className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white pt-5 pb-1 text-[#a14b58] dark:text-[#f48fb1] scroll-mt-24"
            >
              {headingText}
            </h2>
          );
        }

        // Heading 3 (### Heading)
        if (trimmed.startsWith('### ')) {
          const headingText = trimmed.replace(/^###\s+/, '');
          const id = slugify(headingText);
          return (
            <h3
              key={index}
              id={id}
              className="text-lg font-semibold text-gray-900 dark:text-white pt-3 pb-1 scroll-mt-24"
            >
              {headingText}
            </h3>
          );
        }

        // Blockquotes (> Blockquote)
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join(' ');
          const isWarning = quoteLines.includes('IMPORTANT') || quoteLines.includes('WARNING');
          return (
            <blockquote
              key={index}
              className={`p-4 rounded-xl border-l-4 my-4 ${
                isWarning
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-900 dark:text-amber-200'
                  : 'bg-gray-50 dark:bg-gray-800/50 border-[#a14b58] text-gray-800 dark:text-gray-200'
              }`}
            >
              {renderInline(quoteLines)}
            </blockquote>
          );
        }

        // Horizontal Rule (--- or ***)
        if (/^[-*_]{3,}$/.test(trimmed)) {
          return <hr key={index} className="my-6 border-gray-200 dark:border-gray-800" />;
        }

        // Markdown Table
        if (trimmed.includes('|') && trimmed.split('\n').length >= 2) {
          const rows = trimmed.split('\n').filter((r) => r.trim().startsWith('|'));
          if (rows.length >= 2) {
            const headers = rows[0]
              .split('|')
              .slice(1, -1)
              .map((h) => h.trim());
            const dataRows = rows.slice(2).map((r) =>
              r
                .split('|')
                .slice(1, -1)
                .map((cell) => cell.trim())
            );
            return (
              <div key={index} className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white font-semibold">
                    <tr>
                      {headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {dataRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // Bullet list (lines starting with - or *)
        const lines = trimmed.split('\n');
        const isBulletList = lines.every((l) => /^[-*]\s+/.test(l.trim()));
        if (isBulletList) {
          return (
            <ul key={index} className="list-disc list-outside pl-6 space-y-1.5 my-2">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="pl-1">
                  {renderInline(l.trim().replace(/^[-*]\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list (lines starting with 1. 2. etc)
        const isNumberedList = lines.every((l) => /^\d+\.\s+/.test(l.trim()));
        if (isNumberedList) {
          return (
            <ol key={index} className="list-decimal list-outside pl-6 space-y-1.5 my-2">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="pl-1">
                  {renderInline(l.trim().replace(/^\d+\.\s+/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        // General Paragraph (may contain line breaks marked with double spaces or \n)
        return (
          <p key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};
