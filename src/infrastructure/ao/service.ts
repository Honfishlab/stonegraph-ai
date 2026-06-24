/**
 * Arweave Objects (AO) service — decentralized metadata registry
 * Syncs memory metadata to AO compute process for permanent discovery
 *
 * Server-only. Signed with server wallet (ARWEAVE_WALLET_JWK).
 */

import { connect, createSigner } from "@permaweb/aoconnect";

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

export interface FamilyCollection {
  wallet: string;
  memories: AOMemoryInput[];
  updated_at: string;
}

/**
 * Load wallet + create AO connection
 */
function getAOConnection() {
  const walletJson = process.env.ARWEAVE_WALLET_JWK ?? process.env.NEXT_PRIVATE_ARWEAVE_KEY;
  if (!walletJson) {
    return null;
  }

  let jwk: Record<string, unknown>;
  try {
    jwk = JSON.parse(walletJson);
  } catch {
    console.error("[ao] Failed to parse wallet JSON");
    return null;
  }

  return connect({
    MODE: "mainnet",
    URL: HB_URL,
    SCHEDULER,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signer: createSigner(jwk) as any,
  } as any);
}

/**
 * Send AddMemory to AO process — fire and forget (non-fatal).
 * Returns message ID on success, null on failure.
 */
export async function addMemoryToAO(memory: AOMemoryInput): Promise<string | null> {
  const ao = getAOConnection();
  if (!ao || !("message" in ao)) {
    console.warn("[ao] Wallet not configured — skipping AO sync");
    return null;
  }

  try {
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
  const ao = getAOConnection();
  if (!ao || !("message" in ao)) return null;

  try {
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
export async function getFamilyCollection(
  familyId: string
): Promise<FamilyCollection | null> {
  const ao = getAOConnection();
  if (!ao || !("dryrun" in ao)) return null;

  try {
    const result = await ao.dryrun({
      process: AO_PROCESS_ID,
      tags: [
        { name: "Action", value: "Get-Family-Collection" },
        { name: "Family-Id", value: familyId },
      ],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (result as any)?.Messages?.[0]?.Data;
    if (!data) return null;

    return typeof data === "string" ? JSON.parse(data) : data;
  } catch (err) {
    console.error("[ao] Get-Family-Collection failed:", err);
    return null;
  }
}
