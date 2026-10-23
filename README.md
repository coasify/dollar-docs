# Dollar Store documentation

Documentation for Dollar Store, the stablecoin swap protocol published at
[dollarstore.xyz](https://www.dollarstore.xyz).

These pages describe the upcoming `0.11.0` contract interface on
[`fix/guardian-audit` at `ae25d5a`](https://github.com/coasify/dollar/tree/ae25d5a48dcec9f6731773fa0290927d50d638da).
They do not establish which implementation is running on a network. Verify the proxy, chain and
version through [Contract addresses](https://docs.dollarstore.world/resources/addresses) before
integrating; deployment details for this interface remain pending verification.

## Development

Use Node.js 20 or later and the committed dependency lockfile:

```bash
npm ci
npm start
```

## Checks and preview

```bash
npm run check:legal
npm run typecheck
npm run build
npm run serve
```

The production build runs the existing legal-language check and validates internal links and
anchors. Technical Markdown supports Solidity and TypeScript code blocks; prose uses the shared
Cormorant Garamond / EB Garamond style, with JetBrains Mono reserved for code.

## Deployment

Vercel builds with `npm run build` and serves `build/`, using `vercel.json`. Changes to the configured
production branch can deploy automatically; pull requests are intended for review before merging.

The default canonical URL remains `https://docs.dollarstore.world`. The existing xyz build can set
`SITE_VARIANT=xyz` to generate `https://docs.dollarstore.xyz` canonical links. `SITE_URL` overrides
either value when a deployment uses another domain. Both builds use the same content and visual
style; the website and app links point to the current xyz sites.

No domain, DNS or hosting-branch changes are performed by this update.

## Content

- `content/idea.md` introduces the mechanism.
- `content/quickstart.md` gives current integration examples and units.
- `content/concepts/` covers supply, spokes, queues, fill requirements and resolution.
- `content/capabilities/` documents functions, event payloads and error handling.
- `content/resources/` contains version/deployment guidance, security, FAQ and terms.
- `src/css/custom.css` defines the shared light palette and typography.

Keep signatures, return values, event units and error decoders aligned with
[`src/interfaces/IDollarStore.sol`](https://github.com/coasify/dollar/blob/ae25d5a48dcec9f6731773fa0290927d50d638da/src/interfaces/IDollarStore.sol).
When release addresses become available, update the version-scoped notices and deployment page
from verified records rather than reusing an older deployment with the new ABI.

## Related

- [Contracts](https://github.com/coasify/dollar)
- [Website](https://www.dollarstore.xyz)
- [App](https://app.dollarstore.xyz)
