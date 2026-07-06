import React from 'react';
import Link from 'next/link';

/**
 * Soft paywall for Pro features. `feature` names what's locked and rides the
 * View Plans link as ?unlock=<feature>, so the billing page can keep the
 * user's motivation on screen at the exact moment it asks for a card.
 *
 * `preview` renders a blurred example of the locked tool BEHIND the lock —
 * a static lock card sells a description; a glimpse of the actual layout
 * sells the destination. Example data only, blurred and aria-hidden, so it
 * can't be mistaken for (or scraped as) real analytics.
 */

function Bar({ w, color = '#00ff87' }: { w: string; color?: string }) {
  return (
    <div className="h-2 rounded-full" style={{ width: w, background: color, opacity: 0.8 }} />
  );
}

function PatternsPreview() {
  const rows = [
    { label: '“I tested …” title format', pct: '78%', w: '78%' },
    { label: 'Listicle with odd number', pct: '64%', w: '64%' },
    { label: 'Versus / comparison', pct: '57%', w: '57%' },
    { label: 'Challenge format', pct: '41%', w: '41%' },
  ];
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="text-sm font-bold text-white">Winning formats in your niche</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-300 w-48 truncate">{r.label}</span>
          <div className="flex-1 rounded-full" style={{ background: '#222' }}>
            <Bar w={r.w} />
          </div>
          <span className="text-xs font-bold" style={{ color: '#00ff87' }}>{r.pct}</span>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        {['🔥 7.2x', '🚀 4.8x', '⭐ 3.1x'].map((b) => (
          <span key={b} className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#00ff8722', color: '#00ff87' }}>{b}</span>
        ))}
      </div>
    </div>
  );
}

function ComparePreview() {
  const stats = [
    { label: 'Views / day', a: '82%', b: '54%' },
    { label: 'Upload cadence', a: '61%', b: '73%' },
    { label: 'Outlier rate', a: '74%', b: '38%' },
    { label: 'Shorts share', a: '35%', b: '66%' },
  ];
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-6">
        {['Your channel', 'Competitor'].map((name, i) => (
          <div key={name} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full" style={{ background: i === 0 ? '#00ff8744' : '#3b82f644' }} />
              <span className="text-sm font-bold text-white">{name}</span>
            </div>
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-[10px] text-gray-400 mb-1">{s.label}</div>
                <div className="rounded-full" style={{ background: '#222' }}>
                  <Bar w={i === 0 ? s.a : s.b} color={i === 0 ? '#00ff87' : '#3b82f6'} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProLockScreen({
  feature,
  preview,
}: {
  feature?: string;
  preview?: 'patterns' | 'compare';
}) {
  const href = feature ? `/billing?unlock=${encodeURIComponent(feature)}` : '/billing';
  const mock = preview === 'patterns' ? <PatternsPreview /> : preview === 'compare' ? <ComparePreview /> : null;

  // ✨, not 🔒 — a padlock reads as punishment; sparkles read as something
  // worth wanting. The card is a bounded, high-contrast box ON TOP of the
  // blur, so the blur clearly reads as "premium teaser behind glass" instead
  // of "this page failed to render".
  const lockCard = (
    <div
      className="flex flex-col items-center text-center rounded-2xl p-8 max-w-md mx-4"
      style={{
        background: 'rgba(17,24,39,0.95)',
        border: '1px solid rgba(168,85,247,0.4)',
        boxShadow: '0 0 40px rgba(168,85,247,0.15)',
      }}
    >
      <div className="text-4xl mb-4">✨</div>
      <h3 className="text-xl font-bold text-white mb-2">{feature ? `Unlock ${feature}` : 'Unlock this tool'}</h3>
      <p className="text-gray-400 mb-6">Upgrade to the Pro or Growth plan to unlock this tool and level up your channel analytics.</p>
      <Link href={href} className="px-6 py-3 bg-[#00ff87] text-[#0f0f0f] font-semibold rounded-lg hover:bg-[#00ff87]/90 transition-colors">
        View Plans
      </Link>
      {mock && <p className="mt-4 text-xs text-gray-500">Preview shown with example data</p>}
    </div>
  );

  if (!mock) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#111] border border-[#2a2a2a] rounded-xl my-8">
        {lockCard}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-[#111] border border-[#2a2a2a] rounded-xl my-8">
      <div aria-hidden className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.55 }}>
        {mock}
        {/* Repeat the mock so tall viewports stay filled behind the overlay */}
        {mock}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center p-8"
        style={{ background: 'rgba(10,10,10,0.45)' }}
      >
        {lockCard}
      </div>
    </div>
  );
}
