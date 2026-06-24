/**
 * Permanent Viewer utility - generates Arweave-hosted viewer URLs
 * for memories and family collections
 */

export class PermanentViewer {
  private viewerTxId: string | null = null;

  constructor(viewerTxId?: string) {
    this.viewerTxId = viewerTxId || process.env.NEXT_PUBLIC_AO_VIEWER_TX_ID || null;
  }

  /**
   * Generate a permanent viewer URL for a specific memory
   * The viewer page is hosted on Arweave and can load any transaction
   */
  getMemoryViewerUrl(arweaveTxId: string): string | null {
    if (!this.viewerTxId) {
      console.warn('[viewer] No viewer transaction ID configured');
      return null;
    }

    // The viewer.html accepts a tx parameter to load specific content
    return `https://arweave.net/${this.viewerTxId}?tx=${arweaveTxId}`;
  }

  /**
   * Generate a direct Arweave URL for the raw file
   * This is useful as a fallback or for embedding
   */
  getDirectArweaveUrl(arweaveTxId: string): string {
    return `https://arweave.net/${arweaveTxId}`;
  }

  /**
   * Check if the viewer is configured
   */
  isConfigured(): boolean {
    return this.viewerTxId !== null;
  }

  /**
   * Get the viewer transaction ID
   */
  getViewerTxId(): string | null {
    return this.viewerTxId;
  }

  /**
   * Generate HTML embed code for a memory
   */
  getEmbedCode(arweaveTxId: string): string | null {
    const viewerUrl = this.getMemoryViewerUrl(arweaveTxId);
    if (!viewerUrl) return null;

    return `<iframe 
  src="${viewerUrl}" 
  width="600" 
  height="400" 
  frameborder="0" 
  style="border: 1px solid #333; border-radius: 8px;"
  allow="fullscreen"
></iframe>`;
  }

  /**
   * Generate shareable link with metadata
   */
  getShareableLink(arweaveTxId: string, title?: string): string {
    const viewerUrl = this.getMemoryViewerUrl(arweaveTxId);
    if (!viewerUrl) {
      return this.getDirectArweaveUrl(arweaveTxId);
    }

    // For social sharing, we could add Open Graph tags
    // but the viewer page handles its own metadata
    return viewerUrl;
  }
}

// Singleton instance
export const permanentViewer = new PermanentViewer();
