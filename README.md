# mcp-quick-calc

MCP server with **5 quick calculator tools** — currency conversion, percentages, compound interest, unit conversions, and loan payments. Perfect for giving LLMs everyday calculation capabilities.

## Install

```json
{
  "mcpServers": {
    "quick-calc": {
      "command": "npx",
      "args": ["-y", "mcp-quick-calc"]
    }
  }
}
```

## Tools (5)

| Tool | Description |
|------|-------------|
| `currency_convert` | Convert between USD, EUR, GBP, MYR, SGD, JPY, AUD |
| `percentage` | Percentage of, percent change, percent difference |
| `compound_interest` | Calculate compound interest over time |
| `unit_convert` | Length, weight, temperature, data size conversions |
| `loan_payment` | Monthly payment and total interest for loans |

## Zero dependencies

Only requires `@modelcontextprotocol/sdk`. All tools use Node.js built-ins.

## Part of the MCP Toolkit

Want all 60+ tools in one server? Try [mcp-all-tools](https://www.npmjs.com/package/mcp-all-tools).

## Support

If this tool saves you time, consider supporting development:

- [Buy me a coffee](https://buymeacoffee.com/gl89tu25lp)
- [Tip via Stripe ($3)](https://buy.stripe.com/dRm8wP8R295Z9VyeN59Zm00)

## License

MIT
