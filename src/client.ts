// Must be the www host: the bare domain answers with a 308 redirect, and
// fetch drops the Authorization header on that cross-origin redirect.
const API_BASE_URL = "https://www.tnt-audit.com";

export interface InsiderCluster {
  funder: string;
  wallets: string[];
}

export interface TokenRiskResult {
  mint: string;
  safety_score: number;
  cluster_analysis: "pending" | "complete";
  insider_clusters: InsiderCluster[];
  mint_authority: { revoked: boolean; address: string | null };
  freeze_authority: { revoked: boolean; address: string | null };
  honeypot_risk: boolean | null;
  lp_locked: { locked: boolean; percent: number } | null;
  holder_distribution: {
    risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "ERROR";
  };
}

/**
 * Calls the TNT House Risk-Data API to check a Solana token's risk profile.
 * On a mint's first-ever check, cluster_analysis comes back "pending" while the
 * insider-cluster trace runs in the background (usually ready within 1-2 minutes).
 */
export async function checkTokenRisk(
  mint: string,
  apiKey: string
): Promise<TokenRiskResult> {
  const url = `${API_BASE_URL}/api/v1/token-risk?mint=${encodeURIComponent(mint)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    // The API puts a human-readable reason in `message` or `error`.
    let detail = "";
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      detail = body.message || body.error || "";
    } catch {
      // non-JSON body — fall back to the generic messages below
    }
    const suffix = detail ? ` (${detail})` : "";
    if (response.status === 401) {
      // A missing or invalid key falls back to the anonymous demo pool;
      // 401 means that pool is used up for today.
      throw new Error(
        `TNT Risk-Data API: no valid API key and today's anonymous demo quota is used up${suffix}. Set TNT_RISK_API_KEY (free key, 15 requests/day: https://www.tnt-audit.com/risk-api).`
      );
    }
    if (response.status === 402) {
      throw new Error(
        `TNT Risk-Data API: free daily quota or credit used up${suffix}. Wait for the daily reset (UTC), top up the key's balance at https://www.tnt-audit.com/risk-api, or pay per call via x402: https://www.tnt-audit.com/api/v1/token-risk/x402?mint=${encodeURIComponent(mint)} ($0.02 USDC on Solana).`
      );
    }
    if (response.status === 429) {
      throw new Error(`TNT Risk-Data API rate limit hit${suffix}. Retry in a moment.`);
    }
    if (response.status === 400) {
      throw new Error(`Invalid mint address: ${mint}`);
    }
    throw new Error(`TNT Risk-Data API error: HTTP ${response.status}${suffix}`);
  }

  return (await response.json()) as TokenRiskResult;
}

/** Formats a TokenRiskResult into a short, plain-language summary for the agent to speak. */
export function formatRiskSummary(result: TokenRiskResult): string {
  const lines: string[] = [];

  lines.push(`Safety score: ${result.safety_score}/100`);

  if (result.cluster_analysis === "pending") {
    lines.push(
      "Insider-cluster analysis is still running (first check on this mint) — ask again in 1-2 minutes for the full picture."
    );
  } else if (result.insider_clusters.length > 0) {
    const totalWallets = result.insider_clusters.reduce(
      (sum, c) => sum + c.wallets.length,
      0
    );
    lines.push(
      `⚠️ ${result.insider_clusters.length} insider wallet cluster(s) detected (${totalWallets} wallets sharing a first funder).`
    );
  } else {
    lines.push("No insider wallet clusters detected.");
  }

  lines.push(
    `Mint authority: ${result.mint_authority.revoked ? "revoked" : "NOT revoked (⚠️ can mint more supply)"}`
  );
  lines.push(
    `Freeze authority: ${result.freeze_authority.revoked ? "revoked" : "NOT revoked (⚠️ can freeze holder accounts)"}`
  );
  lines.push(`Holder concentration risk: ${result.holder_distribution.risk_level}`);

  return lines.join("\n");
}
