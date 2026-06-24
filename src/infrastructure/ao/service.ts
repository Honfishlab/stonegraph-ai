/**
 * Arweave Objects (AO) service — decentralized metadata registry
 * Uses dynamic imports to avoid browser-only globals loading at build time.
 *
 * Server-only. Signed with server wallet (ARWEAVE_WALLET_JWK).
 */

const AO_PROCESS_ID =
  process.env.NEXT_PUBLIC_AO_PROCESS_ID ??
  "_DlCBw9F1K-Kb5LshIQA9DpyMpsAUZ-cl6TxVU-hj5U";

const HB_URL = "https://push.forward.computer";
const SCHEDULER = "n_XZJhUnmldNFo4dhajoPZWhBXuJk-OcQr5JQ49c4Zo";

export interface AOMemoryInput {
  id: string;
  arweave_tx: string;
  title: string;
  description: string;
  type: string;
  file_type: string;
  tags: string[];
  subjects: string[];
  scene_type: string;
  taken_at: string;
  created_at: string;
  is_public: boolean;
  family_id: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ao: any = null;

/**
 * Lazy-load AO connection (avoids `self` global at build time)
 */
async function getAO() {
  if (_ao) return _ao;

  const walletJson = process.env.ARWEAVE_WALLET_JWK ?? process.env.NEXT_PRIVATE_ARWEAVE_KEY;
  if (!walletJson) return null;

  let jwk: Record<string, unknown>;
  try {
    jwk = JSON.parse(walletJson);
  } catch {
    console.error("[ao] Failed to parse wallet JSON");
    return null;
  }

  // Dynamic import — only evaluates the module on first call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { connect, createSigner } = await import("@permaweb/aoconnect" as any);

  // Polyfill browser globals for aoconnect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (!g.self) g.self = g;
  if (!g.location) {
    g.location = { protocol: "https:", href: HB_URL };
  }

  _ao = connect({
    MODE: "mainnet",
    URL: HB_URL,
    SCHEDULER,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signer: createSigner(jwk) as any,
  });

  return _ao;
}

/**
 * Send AddMemory to AO process — fire and forget (non-fatal).
 */
export async function addMemoryToAO(memory: AOMemoryInput): Promise<string | null> {
  try {
    const ao = await getAO();
    if (!ao || !ao.message) {
      console.warn("[ao] Wallet not configured — skipping AO sync");
      return null;
    }

    const msgId = await ao.message({
      process: AO_PROCESS_ID,
      tags: [{ name: "Action", value: "AddMemory" }],
      data: JSON.stringify(memory),
    });
    return msgId;
  } catch (err) {
    console.error("[ao] AddMemory failed:", err);
    return null;
  }
}

/**
 * Remove memory from AO process.
 */
export async function removeMemoryFromAO(memoryId: string): Promise<string | null> {
  try {
    const ao = await getAO();
    if (!ao || !ao.message) return null;

    const msgId = await ao.message({
      process: AO_PROCESS_ID,
      tags: [{ name: "Action", value: "RemoveMemory" }],
      data: JSON.stringify({ id: memoryId }),
    });
    return msgId;
  } catch (err) {
    console.error("[ao] RemoveMemory failed:", err);
    return null;
  }
}

/**
 * Query family collection from AO (dryrun — no transaction).
 */
export async function getFamilyCollectionFromAO(
  familyId: string
): Promise<{ wallet: string; memories: AOMemoryInput[]; updated_at: string } | null> {
  try {
    const ao = await getAO();
    if (!ao || !ao.dryrun) return null;

    const result = await ao.dryrun({
      process: AO_PROCESS_ID,
      tags: [
        { name: "Action", value: "GetCollection" },
        { name: "Family-Id", value: familyId },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (result as any)?.Messages?.[0]?.Data;
    if (!data) return null;

    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (err) {
    console.error("[ao] GetCollection failed:", err);
    return null;
  }
}
