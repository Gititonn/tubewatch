import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-700">
      <ReactMarkdown
        components={{
          strong: ({node, ...props}) => <span className="font-bold text-gray-900" {...props} />,
          p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
