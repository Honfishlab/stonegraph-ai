"use client";

import { useState } from "react";
import { Share, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface PermanentViewerButtonProps {
  memoryId: string;
  arweaveTxId?: string;
}

export function PermanentViewerButton({
  memoryId,
  arweaveTxId: initialTxId,
}: PermanentViewerButtonProps) {
  const [loading, setLoading] = useState(false);
  const [viewerData, setViewerData] = useState<{
    viewer_url: string | null;
    direct_url: string;
    arweave_tx_id: string;
    configured: boolean;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const loadViewer = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/memories/${memoryId}/viewer`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load viewer");
      }

      setViewerData(data);

      if (!data.configured) {
        toast.warning("Permanent viewer not configured, using direct Arweave link");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load viewer URL");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (!viewerData) {
    return (
      <button
        onClick={loadViewer}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-stone-700 text-white rounded-lg hover:bg-stone-600 transition-colors disabled:opacity-50"
      >
        <Share className="w-4 h-4" />
        {loading ? "Loading..." : "Get Permanent Link"}
      </button>
    );
  }

  const directArweaveUrl = `https://arweave.net/${viewerData.arweave_tx_id}`;

  return (
    <div className="space-y-4 p-4 bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-300 dark:border-stone-700">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Share className="w-5 h-5" />
          Permanent Viewer
        </h3>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Your memory is permanently stored on Arweave blockchain
        </p>
      </div>

      {viewerData.viewer_url ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Viewer Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={viewerData.viewer_url}
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg font-mono"
            />
            <button
              onClick={() => copyToClipboard(viewerData.viewer_url!, "Viewer link")}
              className="px-3 py-2 bg-stone-700 text-white rounded-lg hover:bg-stone-600 transition-colors"
              title="Copy viewer link"
            >
              {copied === "Viewer link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <a
              href={viewerData.viewer_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : (
        <div className="text-sm text-stone-600 dark:text-stone-400">
          Permanent viewer is not configured. Using direct Arweave link below.
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-stone-300 dark:border-stone-700">
        <label className="text-sm font-medium">Direct Arweave Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={directArweaveUrl}
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg font-mono"
          />
          <button
            onClick={() => copyToClipboard(directArweaveUrl, "Arweave link")}
            className="px-3 py-2 bg-stone-700 text-white rounded-lg hover:bg-stone-600 transition-colors"
            title="Copy Arweave link"
          >
            {copied === "Arweave link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <a
            href={directArweaveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="pt-2 border-t border-stone-300 dark:border-stone-700">
        <p className="text-xs text-stone-500 dark:text-stone-400">
          ✓ Permanently stored on Arweave blockchain
          <br />
          ✓ Accessible forever without Stonegraph account
          <br />
          ✓ Shareable via any link
        </p>
      </div>
    </div>
  );
}
