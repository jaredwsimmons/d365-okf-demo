# D365 OKF Demo

A **public, fully-synthetic** demonstration of the
[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
(OKF) bundle + self-contained viewer produced by
[D365OKFApp](https://github.com/jaredwsimmons/D365OKFApp).

Every record here belongs to a made-up company — **Contoso**, a fictional field-service
business (publisher prefix `con_`). **No real customer data.** It exists to prove the
end-to-end publish path: synthetic data → OKF markdown bundle → GitHub Pages.

**Live site:** `https://jaredwsimmons.github.io/d365-okf-demo/`

## What's here

```
data/                 synthetic Contoso seeds (entities, forms, views, automations, …)
scripts/okf/          the database-free OKF emitter + viewer (vendored from D365OKFApp)
.github/workflows/    emit the bundle and deploy it to Pages
```

The published site is `okf-bundle/_viewer.html` (served as `index.html`): a
dependency-free browser with search, type filter, clickable relationships, and a
blast-radius graph. Nothing leaves the page.

## Run it locally

```bash
npm install
DATA_DIR=data npm run okf:bundle   # -> okf-bundle/ (+ _viewer.html)
```

Open `okf-bundle/_viewer.html` in a browser.

## Relation to the real tool

The real pipeline ([D365OKFApp](https://github.com/jaredwsimmons/D365OKFApp)) starts
from unpacked Dataverse solution XML and runs a PowerShell extract before this same
emitter. This demo skips that step and feeds the emitter hand-authored JSON, so it can
run anywhere (no PowerShell, no database) and expose nothing real.
