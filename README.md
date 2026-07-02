# D365 OKF Demo

A **public, fully-synthetic** deployment of the **D365 OKF dashboard** — the real
interactive app (entity ERD, dependency graphs, sitemaps, process catalog,
governance, capability map, …) running as a **static site** on GitHub Pages, with
**no database and no server**.

Every record belongs to a made-up company — **Contoso Ltd**, a fictional enterprise
running a **complete Dynamics 365 deployment** across all modules (Sales, Customer
Service, Field Service, Project Operations, Marketing / Customer Insights, Finance,
Supply Chain, Commerce, Human Resources, Contact Center, and shared platform) —
real out-of-box tables layered with Contoso customizations (publisher prefix
`con_`). **No real customer data.**

**Live site:** `https://jaredwsimmons.github.io/d365-okf-demo/`

## How it works

The dashboard normally talks to a Postgres-backed API. For this static demo, every
GET API response was pre-rendered to JSON once and committed:

```
public/api-snapshot/v1/**.json   the baked Contoso API responses the app reads
data/**.json                     the raw synthetic Contoso seeds they were built from
src/**                           the real dashboard UI (Next.js + React)
scripts/static/build-static.mjs  static-export wrapper (output: "export")
scripts/okf/build-snapshot.mjs   regenerates the snapshots from a seeded DB
scripts/bpc-catalog.json         the real Microsoft Business Process Catalog (DEC 2025.1): 15 end-to-end → 94 areas → 672 processes
scripts/bpc-classification*.json the real rule set that maps components to BPC codes (product rules + demo extension for all 15 L1s)
scripts/apply-bpc-tags.mjs       classifies every Contoso component onto the real catalog by rule (entity map, patterns, keywords)
```

At build time the app is exported with `output: "export"` and
`NEXT_PUBLIC_STATIC=1`, which switches the client's fetch layer to read the
committed snapshots (and run search / list-filtering in the browser). Writes
(curation, diagram upload) are accepted as no-ops — it's a read-only showcase.

## Build it locally

```bash
npm install
npm run build:static     # -> out/  (static site)
npx serve out            # open http://localhost:3000/
```

## Regenerate the Contoso data + snapshots (optional)

The synthetic org is generated from a per-module blueprint, then baked to snapshots:

```bash
# 1. (re)generate the raw seeds from the 12-module blueprint
node scripts/gen-d365-complete.mjs scripts/d365-blueprint.json data

# 1b. classify every component onto the REAL Microsoft Business Process Catalog
#     (writes the real 15/94/672 catalog to data/ProcessCatalog.json and stamps
#      processCatalogL1/L2/L3 tags by rule — same engine the product runs on a live org)
node scripts/apply-bpc-tags.mjs data

# 2. seed a throwaway DB, crawl every endpoint into the snapshots
npm run db:setup                        # docker Postgres + schema + seed from data/
DATABASE_URL=...coe_contoso npm run dev # start the app in DB mode (port 3100)
npm run snapshot                        # crawl every endpoint -> public/api-snapshot

# 3. regenerate the BPC process-flow SVGs + manifest
node scripts/gen-bpc-diagrams.mjs
```

`scripts/d365-blueprint.json` is the verified per-module spec (real out-of-box
tables + Contoso customizations). `gen-d365-complete.mjs` derives all 28 inventory
files plus deep detail (form/view details, flow complexity, web-resource code
analysis) and the environment-drift matrix from it. The older single-vertical
`gen-contoso.mjs` is kept for reference.

The **Process Catalog** is the real thing: `scripts/bpc-catalog.json` is Microsoft's
published Business Process Catalog (DEC 2025.1) — all 15 end-to-end processes
(Acquire to dispose → Administer to operate), 94 process areas, and 672 processes.
`apply-bpc-tags.mjs` then classifies every Contoso component onto it using the real
rule set (`bpc-classification.json`, the product's entity/pattern/keyword rules,
plus `bpc-classification-ext.json` extending coverage to all 15 L1s), so the Process
Catalog tab shows how a complete D365 org maps across Microsoft's taxonomy — the same
classification the dashboard runs against a live customer environment.

## Relation to the product

The OKF dashboard itself lives in
[D365OKFApp](https://github.com/jaredwsimmons/D365OKFApp); this repo is just a
public Contoso deployment of it.
