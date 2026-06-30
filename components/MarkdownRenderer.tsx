import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-gray-300">
      <ReactMarkdown
        components={{
          strong: ({node, ...props}) => <span className="font-bold text-[#00ff87]" {...props} />,
          p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
