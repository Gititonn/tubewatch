import React from 'react';
import Link from 'next/link';

/**
 * Soft paywall for Pro features. `feature` names what's locked and rides the
 * View Plans link as ?unlock=<feature>, so the billing page can keep the
 * user's motivation on screen ("Unlock Patterns with Pro") at the exact
 * moment it asks for a card — instead of dropping them on a generic table
 * that's forgotten why they came.
 */
export default function ProLockScreen({ feature }: { feature?: string }) {
  const href = feature ? `/billing?unlock=${encodeURIComponent(feature)}` : '/billing';
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#111] border border-[#2a2a2a] rounded-xl text-center my-8">
      <div className="text-4xl mb-4">🔒</div>
      <h3 className="text-xl font-bold text-white mb-2">{feature ? `${feature} is a Pro feature` : 'Premium Feature'}</h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">Upgrade to the Pro or Growth plan to unlock this tool and level up your channel analytics.</p>
      <Link href={href} className="px-6 py-3 bg-[#00ff87] text-[#0f0f0f] font-semibold rounded-lg hover:bg-[#00ff87]/90 transition-colors">
        View Plans
      </Link>
    </div>
  );
}
