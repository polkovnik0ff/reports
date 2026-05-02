"use client";

interface BlockWrapperProps {
  id: string;
  title: string;
  commentAbove?: string;
  commentBelow?: string;
  children: React.ReactNode;
}

export function BlockWrapper({ id, title, commentAbove, commentBelow, children }: BlockWrapperProps) {
  return (
    <div id={id} className="report-block mb-10 scroll-mt-6">
      {commentAbove && (
        <div
          className="prose-report mb-4 text-sm text-muted-foreground"
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
          className="prose-report mt-4 text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: commentBelow }}
        />
      )}
    </div>
  );
}
