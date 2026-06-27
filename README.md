# D365 OKF Demo

A **public, fully-synthetic** deployment of the **D365 OKF dashboard** — the real
interactive app (entity ERD, dependency graphs, sitemaps, process catalog,
governance, capability map, …) running as a **static site** on GitHub Pages, with
**no database and no server**.

Every record belongs to a made-up company — **Contoso**, a fictional field-service
business (publisher prefix `con_`). **No real customer data.**

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

## Regenerate the Contoso snapshots (optional)

Only needed if you change `data/`:

```bash
npm run db:setup                       # docker Postgres + schema + seed from data/
DATABASE_URL=...coe_contoso npm run dev # start the app in DB mode (port 3100)
npm run snapshot                       # crawl every endpoint -> public/api-snapshot
```

## Relation to the product

The OKF dashboard itself lives in
[D365OKFApp](https://github.com/jaredwsimmons/D365OKFApp); this repo is just a
public Contoso deployment of it.
