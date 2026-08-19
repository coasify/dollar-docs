# DollarStore Documentation

Documentation site for [dollarstore.world](https://dollarstore.world) — a zero-fee stablecoin swap protocol.

**Live site:** [docs.dollarstore.world](https://docs.dollarstore.world)

## Development

```bash
npm install
npm start
```

Opens development server at `http://localhost:3000`.

## Build

```bash
npm run build
npm run serve  # Preview build locally
```

## Deployment

Deployed automatically via Vercel on push to `main`. Build settings live in `vercel.json`.

## Structure

```
content/
├── idea.md              # What DollarStore is
├── quickstart.md        # Integration guide (placeholder)
├── concepts/            # How it works
│   ├── supply.md
│   ├── queue.md
│   ├── time-tradeoff.md
│   └── resolution.md
├── capabilities/        # Contract reference
│   ├── overview.md
│   ├── functions.md
│   ├── events.md
│   └── errors.md
└── resources/           # Addresses, security, FAQ, terms
    ├── addresses.md
    ├── security.md
    ├── faq.md
    └── terms.md
```

## Related

- Main protocol: [github.com/wandering-soupsmith/dollar](https://github.com/wandering-soupsmith/dollar)
- App: [dollarstore.world](https://dollarstore.world)
