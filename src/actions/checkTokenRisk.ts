import { z } from "zod";
import type { SolanaAgentKit } from "solana-agent-kit";
import { checkTokenRisk, formatRiskSummary } from "../client";

export const checkTokenRiskSchema = z.object({
  mint: z.string().describe("The Solana token mint address to check for risk"),
});

/**
 * Resolves the TNT Risk-Data API key from agent config (OTHER_API_KEYS.TNT_RISK_API_KEY)
 * or, as a fallback, from the TNT_RISK_API_KEY environment variable.
 */
function resolveApiKey(agent: SolanaAgentKit): string {
  const fromConfig = agent.config?.OTHER_API_KEYS?.TNT_RISK_API_KEY;
  const fromEnv = typeof process !== "undefined" ? process.env.TNT_RISK_API_KEY : undefined;
  const apiKey = fromConfig || fromEnv;

  if (!apiKey) {
    throw new Error(
      "TNT_RISK_API_KEY not found. Set it in agent config under OTHER_API_KEYS.TNT_RISK_API_KEY, or as an env var. Get a free key (15 req/day, no card) at https://www.tnt-audit.com/risk-api."
    );
  }
  return apiKey;
}

export const checkTokenRiskAction = {
  name: "CHECK_TOKEN_RISK",
  similes: [
    "check token safety",
    "analyze token risk",
    "is this token safe",
    "check for rug pull",
    "check insider clusters",
    "token risk score",
  ],
  description:
    "Checks a Solana token mint for risk before trading it: 0-100 safety score, on-chain insider wallet cluster detection (shared first-funder tracing), mint/freeze authority status, and holder concentration. Powered by the TNT House Risk-Data API. Use this before deploying capital into any Solana token.",
  examples: [
    [
      {
        input: { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
        output: {
          status: "success",
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          safety_score: 92,
          cluster_analysis: "complete",
          summary: "Safety score: 92/100\nNo insider wallet clusters detected.",
        },
        explanation: "Checks a token's risk profile before the agent decides whether to trade it.",
      },
    ],
  ],
  schema: checkTokenRiskSchema,
  handler: async (agent: SolanaAgentKit, input: Record<string, any>) => {
    const { mint } = checkTokenRiskSchema.parse(input);
    const apiKey = resolveApiKey(agent);

    try {
      const result = await checkTokenRisk(mint, apiKey);
      return {
        status: "success",
        mint: result.mint,
        safety_score: result.safety_score,
        cluster_analysis: result.cluster_analysis,
        insider_clusters: result.insider_clusters,
        mint_authority: result.mint_authority,
        freeze_authority: result.freeze_authority,
        holder_distribution: result.holder_distribution,
        summary: formatRiskSummary(result),
      };
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
