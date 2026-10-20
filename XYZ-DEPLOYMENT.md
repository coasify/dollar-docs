# .xyz docs build

Use this branch in a NEW Vercel project to retain the existing .world documentation deployment.
Set `SITE_VARIANT=xyz` for Preview and Production, Node 22, build `npm run build`, output `build`.
Assign `docs.dollarstore.xyz` to that project; check the CNAME Vercel supplies and update Namecheap if
it differs after reassignment. Keep the existing .world project's branch and environment unchanged.

The variant changes only CSS, the logo, canonical site URL, and website/app navigation destinations.
All markdown content, legal documents, and existing disclaimers are retained without prose edits.
The companion frontend branch is `feat/base-deployment-preview-e` in `coasify/dollar_internal`;
its `frontend/XYZ-DEPLOYMENT.md` covers the domain, geofence, secrets, and launch verification steps.

Validated with `SITE_VARIANT=xyz npm run build` and `npm run typecheck`.
