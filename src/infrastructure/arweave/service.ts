/**
 * Arweave infrastructure — permanent storage layer
 * Uploads data to Arweave blockchain and provides permanent URLs
 */

import Arweave from "arweave";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JWKInterface = any;

class ArweaveStorageService {
  private arweave: InstanceType<typeof Arweave>;
  private wallet: JWKInterface | null = null;

  constructor() {
    this.arweave = new Arweave({
      host: "arweave.net",
      port: 443,
      protocol: "https",
    });
  }

  /**
   * Load wallet from environment (NEXT_PRIVATE_ARWEAVE_KEY)
   * This is a JSON string containing the JWK wallet
   */
  async loadWallet(): Promise<JWKInterface> {
    if (this.wallet) return this.wallet;

    const keyJson = process.env.NEXT_PRIVATE_ARWEAVE_KEY;
    if (!keyJson) {
      throw new Error(
        "NEXT_PRIVATE_ARWEAVE_KEY environment variable is required"
      );
    }

    this.wallet = JSON.parse(keyJson) as JWKInterface;
    return this.wallet;
  }

  /**
   * Upload data to Arweave with tags
   * @returns Transaction ID
   */
  async upload(
    data: Buffer | Uint8Array | string,
    tags: Record<string, string> = {}
  ): Promise<string> {
    const wallet = await this.loadWallet();

    // Create transaction
    const transaction = await this.arweave.createTransaction(
      { data },
      wallet
    );

    // Add custom tags
    for (const [key, value] of Object.entries(tags)) {
      transaction.addTag(key, value);
    }

    // Sign and post
    await this.arweave.transactions.sign(transaction, wallet);
    const response = await this.arweave.transactions.post(transaction);

    if (response.status !== 200 && response.status !== 202) {
      throw new Error(
        `Arweave upload failed: ${response.status} ${response.statusText}`
      );
    }

    return transaction.id;
  }

  /**
   * Upload a file (convenience wrapper)
   */
  async uploadFile(
    file: Buffer,
    contentType: string,
    metadata: Record<string, string> = {}
  ): Promise<string> {
    return this.upload(file, {
      "Content-Type": contentType,
      ...metadata,
    });
  }

  /**
   * Generate permanent URL for a transaction
   */
  getPermanentUrl(txId: string): string {
    return `https://arweave.net/${txId}`;
  }

  /**
   * Check if a transaction exists and is confirmed
   */
  async exists(txId: string): Promise<boolean> {
    try {
      await this.arweave.transactions.getStatus(txId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(txId: string) {
    return this.arweave.transactions.get(txId);
  }
}

// Singleton instance
export const arweaveService = new ArweaveStorageService();
