import type { SolanaAgentKit, Plugin } from "solana-agent-kit";
import { checkTokenRiskAction } from "./actions/checkTokenRisk";

const RiskApiPlugin = {
  name: "risk-api",

  methods: {
    checkTokenRisk: checkTokenRiskAction.handler,
  },

  actions: [checkTokenRiskAction],

  initialize(_agent: SolanaAgentKit): void {
    // Stateless plugin — no setup required beyond the API key,
    // which is resolved lazily inside the action handler.
  },
} satisfies Plugin;

export default RiskApiPlugin;
export { checkTokenRiskAction, checkTokenRiskSchema } from "./actions/checkTokenRisk";
export { checkTokenRisk, formatRiskSummary } from "./client";
export type { TokenRiskResult, InsiderCluster } from "./client";
