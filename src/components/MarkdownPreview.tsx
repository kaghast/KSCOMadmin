import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  imgMaxHeight?: string;
}

/**
 * Preprocess markdown content to preserve multiple consecutive empty lines.
 * Standard markdown collapses >=3 newlines into 2 paragraphs (1 empty line).
 * Here, N newlines >= 3 will render as N-1 empty lines by inserting non-breaking spaces.
 */
export function preprocessMarkdownContent(text: string): string {
  if (!text) return '';

  // Standardize line endings
  let processed = text.replace(/\r\n/g, '\n');

  // Preserve 3 or more consecutive newlines (e.g., 3 newlines = 2 blank lines, 4 = 3 blank lines)
  processed = processed.replace(/\n{3,}/g, (match) => {
    const count = match.length;
    return '\n\n' + Array(count - 2).fill('&nbsp;').join('\n\n') + '\n\n';
  });

  return processed;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className = '',
  imgMaxHeight = 'max-h-72',
}) => {
  if (!content || !content.trim()) return null;

  const formattedContent = preprocessMarkdownContent(content);

  return (
    <div className={`prose max-w-none text-slate-800 break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        urlTransform={(url) => url}
        components={{
          a: ({ href, children, ...props }) => {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer break-all"
                onClick={(e) => e.stopPropagation()}
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            if (!src) return null;
            return (
              <img
                src={src}
                alt={alt || 'Görsel'}
                className={`${imgMaxHeight} rounded-xl border border-slate-200 my-2 object-contain bg-white shadow-2xs`}
                referrerPolicy="no-referrer"
                {...props}
              />
            );
          },
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
};
