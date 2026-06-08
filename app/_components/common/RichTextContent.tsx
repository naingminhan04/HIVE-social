"use client";

type RichTextContentProps = {
  text: string;
  className?: string;
  onHashtagClick?: (tag: string) => void;
};

const URL_REGEX = /https?:\/\/[^\s]+/gi;
const HASHTAG_REGEX = /(^|[^\w])#([A-Za-z0-9_]+)/g;

const RichTextContent = ({
  text,
  className,
  onHashtagClick,
}: RichTextContentProps) => {
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, lineIndex) => {
        const urlMatches = Array.from(line.matchAll(URL_REGEX));
        let cursor = 0;
        const pieces: React.ReactNode[] = [];

        for (const match of urlMatches) {
          const url = match[0];
          const index = match.index ?? 0;

          if (index > cursor) {
            pieces.push(
              ...renderHashtags(
                line.slice(cursor, index),
                `${lineIndex}-${cursor}`,
                onHashtagClick,
              ),
            );
          }

          pieces.push(
            <a
              key={`url-${lineIndex}-${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
              onClick={(event) => event.stopPropagation()}
            >
              {url}
            </a>,
          );

          cursor = index + url.length;
        }

        if (cursor < line.length) {
          pieces.push(
            ...renderHashtags(
              line.slice(cursor),
              `${lineIndex}-${cursor}`,
              onHashtagClick,
            ),
          );
        }

        return (
          <span key={`line-${lineIndex}`}>
            {pieces.length > 0 ? pieces : line}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        );
      })}
    </div>
  );
};

function renderHashtags(
  segment: string,
  keyPrefix: string,
  onHashtagClick?: (tag: string) => void,
) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(HASHTAG_REGEX);

  while ((match = regex.exec(segment)) !== null) {
    const full = match[0];
    const leading = match[1] ?? "";
    const tag = match[2] ?? "";
    const start = match.index;
    const leadingLength = leading.length;
    const hashStart = start + leadingLength;

    if (start > lastIndex) {
      nodes.push(segment.slice(lastIndex, start));
    }
    if (leading) {
      nodes.push(leading);
    }

    nodes.push(
      <button
        key={`${keyPrefix}-tag-${hashStart}-${tag}`}
        type="button"
        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        onClick={(event) => {
          event.stopPropagation();
          onHashtagClick?.(tag);
        }}
      >
        #{tag}
      </button>,
    );

    lastIndex = start + full.length;
  }

  if (lastIndex < segment.length) {
    nodes.push(segment.slice(lastIndex));
  }

  return nodes;
}

export default RichTextContent;
