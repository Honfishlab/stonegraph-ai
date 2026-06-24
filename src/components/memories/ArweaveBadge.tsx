"use client";

import { useState } from "react";
import { Globe, Info } from "lucide-react";

interface ArweaveBadgeProps {
  arweaveTxId?: string;
}

export function ArweaveBadge({ arweaveTxId }: ArweaveBadgeProps) {
  const [showInfo, setShowInfo] = useState(false);

  if (!arweaveTxId) {
    return null;
  }

  const arweaveUrl = `https://arweave.net/${arweaveTxId}`;

  return (
    <>
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-xs font-medium">
        <Globe className="w-3 h-3" />
        <span>Permanent on Arweave</span>
        <button
          onClick={() => setShowInfo(true)}
          className="ml-1 hover:opacity-70"
          title="Learn more"
        >
          <Info className="w-3 h-3" />
        </button>
      </div>

      {showInfo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-lg p-6 max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-3">Permanently Stored on Arweave</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
              Your memory is permanently stored on the Arweave blockchain. This means:
            </p>
            <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-2 mb-4">
              <li>✓ Stored forever - no expiration</li>
              <li>✓ Cannot be deleted or modified</li>
              <li>✓ Accessible without a Stonegraph account</li>
              <li>✓ Decentralized and immutable</li>
            </ul>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-stone-500">Arweave Transaction ID</label>
                <p className="text-xs font-mono break-all text-stone-700 dark:text-stone-300">
                  {arweaveTxId}
                </p>
              </div>
              <a
                href={arweaveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm"
              >
                View on Arweave Network ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
