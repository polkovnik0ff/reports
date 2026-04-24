"use client";

interface BlockWrapperProps {
  title: string;
  commentAbove?: string;
  commentBelow?: string;
  children: React.ReactNode;
}

export function BlockWrapper({ title, commentAbove, commentBelow, children }: BlockWrapperProps) {
  return (
    <div className="mb-10">
      {commentAbove && (
        <div
          className="mb-4 text-sm italic text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: commentAbove }}
        />
      )}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <div className="mt-1 h-px bg-gray-200" />
      </div>
      {children}
      {commentBelow && (
        <div
          className="mt-4 text-sm italic text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: commentBelow }}
        />
      )}
    </div>
  );
}
