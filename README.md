# Dollar Store documentation

Documentation for Dollar Store, the stablecoin swap protocol published at
[dollarstore.xyz](https://www.dollarstore.xyz).

These pages describe the `1.0.0` contract interface on
[release reference `b1668d0`](https://github.com/coasify/dollar/tree/b1668d0835c896e6ec310f51b3598e97cc5e46b0).
Ethereum mainnet reports version `1.0.0`. See [Contract addresses](https://docs.dollarstore.xyz/resources/addresses)
for the verified proxy, asset registry, governance snapshot and outstanding build-provenance checks.

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

The default canonical URL is `https://docs.dollarstore.xyz`. Set `SITE_VARIANT=world` for an explicit
legacy-domain build, or `SITE_URL` to override the canonical URL for another deployment. Both builds use the same content and visual
style; the website and app links point to the current xyz sites.

Production publishes from `main` through the existing Vercel docs project; domain and DNS settings remain in Vercel and the registrar.

## Content

- `content/idea.md` introduces the mechanism.
- `content/quickstart.md` gives current integration examples and units.
- `content/concepts/` covers supply, spokes, queues, fill requirements and resolution.
- `content/capabilities/` documents functions, event payloads and error handling.
- `content/resources/` contains version/deployment guidance, security, FAQ and terms.
- `src/css/custom.css` defines the shared light palette and typography.

Keep signatures, return values, event units and error decoders aligned with
[`src/interfaces/IDollarStore.sol`](https://github.com/coasify/dollar/blob/b1668d0835c896e6ec310f51b3598e97cc5e46b0/src/interfaces/IDollarStore.sol).
Refresh deployment snapshots from read-only chain queries; do not substitute script defaults for observed role holders or delays.

## Related

- [Contracts](https://github.com/coasify/dollar)
- [Website](https://www.dollarstore.xyz)
- [App](https://app.dollarstore.xyz)
