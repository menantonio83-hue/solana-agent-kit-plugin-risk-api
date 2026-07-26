# solana-agent-kit-plugin-risk-api

A [Solana Agent Kit](https://kit.sendai.fun/) plugin that gives your agent a **`CHECK_TOKEN_RISK`** action, backed by the [TNT House Risk-Data API](https://www.tnt-audit.com/risk-api).

Before your agent trades a Solana token, it can check:

- **Safety score (0-100)** — weighted from mint/freeze authority, holder concentration, liquidity, volume, and insider-cluster penalties
- **Insider wallet clusters** — wallets that share a first funder (on-chain-provable insider/sniper signal)
- **Mint & freeze authority status** — revoked or not
- **Holder concentration risk level**

## Install

```bash
npm install solana-agent-kit-plugin-risk-api
```

## Usage

```ts
import { SolanaAgentKit, KeypairWallet } from "solana-agent-kit";
import RiskApiPlugin from "solana-agent-kit-plugin-risk-api";

const agent = new SolanaAgentKit(wallet, rpcUrl, {
  OTHER_API_KEYS: {
    TNT_RISK_API_KEY: process.env.TNT_RISK_API_KEY!,
  },
}).use(RiskApiPlugin);

const result = await agent.methods.checkTokenRisk(agent, {
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
});

console.log(result.summary);
```

Or call the client directly, without the agent wrapper:

```ts
import { checkTokenRisk, formatRiskSummary } from "solana-agent-kit-plugin-risk-api";

const result = await checkTokenRisk(mintAddress, process.env.TNT_RISK_API_KEY!);
console.log(formatRiskSummary(result));
```

## Configuration

Get a free API key (15 requests/day, no card required) at **[tnt-audit.com/risk-api](https://www.tnt-audit.com/risk-api)**.

The plugin reads the key from `agent.config.OTHER_API_KEYS.TNT_RISK_API_KEY`, falling back to the `TNT_RISK_API_KEY` environment variable if that's not set.

### Note on first-time checks

On a mint's **first-ever** check, `cluster_analysis` comes back `"pending"` while the insider-cluster trace runs in the background (usually ready within 1-2 minutes). A second call to the same mint shortly after will return `"complete"` with the full cluster breakdown.

## Docs

Full API reference, response schema, and rate limits: **[tnt-audit.com/risk-api](https://www.tnt-audit.com/risk-api)**

## License

MIT
