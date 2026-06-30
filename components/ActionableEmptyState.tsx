import React from 'react';
import Link from 'next/link';

export default function ActionableEmptyState({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#111] border border-[#2a2a2a] rounded-xl text-center my-8">
      <div className="text-4xl mb-4">📊</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">{description}</p>
      <Link href="/competitors" className="px-6 py-3 bg-[#00ff87] text-[#0f0f0f] font-semibold rounded-lg hover:bg-[#00ff87]/90 transition-colors">
        Track Your First Competitor
      </Link>
    </div>
  );
}
