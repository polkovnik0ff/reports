"use client";

interface RichTextBlockProps {
  content: string;
}

export function RichTextBlock({ content }: RichTextBlockProps) {
  if (!content) {
    return <p className="text-gray-400 italic text-sm">Содержимое не заполнено</p>;
  }

  return (
    <div
      className="prose-report leading-relaxed"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
