const API_BASE_URL = "https://tnt-audit.com";

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
  lp_locked: boolean | null;
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
    if (response.status === 401) {
      throw new Error(
        "TNT Risk-Data API rejected the key — check TNT_RISK_API_KEY is set correctly."
      );
    }
    if (response.status === 402) {
      throw new Error(
        "TNT Risk-Data API daily quota exceeded for this key. Get a new free key at https://www.tnt-audit.com/risk-api."
      );
    }
    if (response.status === 400) {
      throw new Error(`Invalid mint address: ${mint}`);
    }
    throw new Error(`TNT Risk-Data API error: HTTP ${response.status}`);
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
