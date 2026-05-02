"use client";

interface RichTextBlockProps {
  content: string;
}

export function RichTextBlock({ content }: RichTextBlockProps) {
  if (!content) {
    return (
      <p style={{ color: "var(--r-ink-mute)", fontStyle: "italic", fontSize: 14 }}>
        Содержимое не заполнено
      </p>
    );
  }

  return (
    <div
      className="prose-report"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
