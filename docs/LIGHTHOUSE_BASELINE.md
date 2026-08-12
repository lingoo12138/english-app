# W142 Lighthouse CI Baseline (v2.1.x)

> Snapshot taken **2026-08-12** by `general` (W142) against the v2.1.x `main` branch.
> Local URL: `http://127.0.0.1:4173/english-app/` (built from current `dist/` + `scripts/spa_server.py`).
> Production target: `https://lingoo12138.github.io/english-app/`.
> Tool: `lighthouse@12.8.2` + `@lhci/cli@0.15.1`, `preset=desktop`, `numberOfRuns=1`.
> CI: `.github/workflows/lighthouse.yml` (push to main + manual dispatch).

## Summary

| Category       | Score | Threshold | Verdict |
| -------------- | ----: | --------: | :------ |
| Performance    |  0.71 |   0.80 (warn) | warn     |
| Accessibility  |  0.91 |   0.90 (error) | pass    |
| Best Practices |  1.00 |   0.85 (warn) | pass    |
| SEO            |  0.91 |   0.80 (warn) | pass    |

### Core Web Vitals (desktop preset)

| Metric                       | Value      | Threshold      | Verdict |
| ---------------------------- | ---------: | -------------: | :------ |
| First Contentful Paint (FCP) | 1.127 s    | ≤ 2.0 s (warn) | pass    |
| **Largest Contentful Paint (LCP)** | **6.899 s** | ≤ 4.0 s (error) | **fail** |
| Total Blocking Time (TBT)    | 80 ms      | ≤ 300 ms (warn)| pass    |
| Cumulative Layout Shift (CLS)| 0.083      | ≤ 0.10 (warn)  | pass    |
| Speed Index                  | 1.127 s    | ≤ 3.0 s (warn) | pass    |
| Time to Interactive          | 6.899 s    | n/a            | info    |

## LCP diagnosis (the one real regression)

LCP element: `<p class="text-sm … line-clamp-2">` inside `Home` card list (lesson summary text).
LCP phase breakdown:

| Phase        | Timing (ms) | % of LCP |
| ------------ | ----------: | -------: |
| TTFB         |       197.0 |      3 % |
| Load Delay   |         0.0 |      0 % |
| Load Time    |         0.0 |      0 % |
| **Render Delay** | **6 701.8** |  **97 %** |

97 % of LCP is **Render Delay** — the bytes arrived fast (TTFB ~200 ms) but the browser waited
~6.7 s before the LCP element could paint. This points at client-side work blocking the
main thread after hydration (Dexie + lesson query + card render).

Bootup time leaders (top by main-thread scripting):
- `react-vendor-Dc3BUvRu.js` — 183 ms
- `db-vendor-kfNg-Duc.js` — 91 ms
- Unattributable — 48 ms
- `index-BHmLhiEp.js` — 8 ms

Render-blocking:
- `assets/index-wPm-FH9b.css` — 113 KB / 517 ms wasted (largest render-blocking resource)

## Network (top assets, descending by transfer)

| Size     | URL                                  |
| -------: | :----------------------------------- |
| 6 322.7 KB | `/english-app/data/words.json`     |
|   161.1 KB | `/english-app/assets/react-vendor-Dc3BUvRu.js` |
|   110.6 KB | `/english-app/assets/index-wPm-FH9b.css` |
|    97.3 KB | `/english-app/assets/index-BHmLhiEp.js`  |
|    94.3 KB | `/english-app/assets/db-vendor-kfNg-Duc.js` |
|    57.0 KB | `/english-app/assets/llm-vendor-C2C5VZ7A.js` |
|    26.4 KB | `/english-app/assets/AIChat-C9alOshn.js` |
|    23.8 KB | `/english-app/assets/Home-0aSX8vNL.js` |

Total over the wire (36 requests): **7 107 KB** (dominated by `words.json`).

## Failed audits (action items)

Accessibility (score 0.91, **just above** the 0.90 error bar):
- `color-contrast` — Background/foreground contrast ratio insufficient.
- `label-content-name-mismatch` — Visible text label does not match accessible name.
- `target-size` — Touch targets too small / too close.

SEO (score 0.91, 57 errors):
- `robots-txt is not valid` — 57 errors (likely a malformed or over-broad `robots.txt`).

## Configuration snapshot

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["https://lingoo12138.github.io/english-app/"],
      "numberOfRuns": 1,
      "settings": { "preset": "desktop", "skipAudits": ["uses-http2"] }
    },
    "assert": {
      "assertions": {
        "categories:performance":     ["warn", { "minScore": 0.8 }],
        "categories:accessibility":   ["error", { "minScore": 0.9 }],
        "categories:best-practices":  ["warn", { "minScore": 0.85 }],
        "categories:seo":             ["warn", { "minScore": 0.8 }],
        "first-contentful-paint":     ["warn",  { "maxNumericValue": 2000 }],
        "largest-contentful-paint":   ["error", { "maxNumericValue": 4000 }],
        "total-blocking-time":        ["warn",  { "maxNumericValue": 300 }],
        "cumulative-layout-shift":    ["warn",  { "maxNumericValue": 0.1 }],
        "speed-index":                ["warn",  { "maxNumericValue": 3000 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

## Reproduce locally

```bash
cd /workspace/english-app
# build
npm run build
# serve (SPA fallback for /english-app/*)
pkill -f spa_server 2>/dev/null
nohup python3 scripts/spa_server.py 4173 > /tmp/spa.log 2>&1 &
sleep 3
curl -s -o /dev/null -w "spa=%{http_code}\n" http://127.0.0.1:4173/english-app/

# run Lighthouse CI (collect + assert; uses .lighthouserc.json)
export CHROME_PATH=/root/.cache/ms-playwright/chromium-1223/chrome-linux/chrome
npx lhci collect --url=http://127.0.0.1:4173/english-app/ \
                 --numberOfRuns=1 \
                 --settings.chromeFlags="--no-sandbox --headless --disable-gpu --disable-dev-shm-usage"
npx lhci assert
# Raw reports land in .lighthouseci/lhr-*.json + lhr-*.html
```

CI in GitHub Actions runs the same flow with `npx @lhci/cli autorun` on every push to `main`
and on manual dispatch; the `||` guard on the autorun step means assertion failures still
exit 0, so the run is a regression detector (report + diff) rather than a hard gate.

## Next steps (tracked, not in W142 scope)

1. LCP 6.9 s → reduce Render Delay:
   - Defer non-critical `data/words.json` fetch off the LCP path (cache then inject).
   - Inline the critical CSS or split `index-wPm-FH9b.css` (113 KB render-blocking).
   - Skeleton the `Home` card list so first paint is not blocked on Dexie read.
2. SEO: fix `robots.txt` (57 errors flagged by Lighthouse).
3. a11y: bump `accessibility` 0.91 → 0.95+ to safely absorb future regressions; current
   0.90 error bar is one contrast tweak away from a hard fail.
