# Reddit Show HN 贴文 (英文版) — 280 字 + technical depth

**Title**: Show HN: I built an offline-first English learning PWA in 22 weeks (5,423 words, 1,941 tests, 0 trackers)

**Subreddit**: r/SideProject, r/InternetIsBeautiful, r/learnprogramming (cross-post)

---

Hey HN,

After 22 weeks of solo work, I'm sharing my offline-first English learning PWA.

**Link**: https://lingoo12138.github.io/english-app/ (GitHub Pages, $0 server cost)

**GitHub**: https://github.com/lingoo12138/english-app (every commit public, 22 weeks of history)

### What it is

A fully client-side English learning PWA. No accounts, no cloud, no tracking. All data lives in your browser's IndexedDB. Once loaded, it works offline. Install to home screen (Chrome/Edge) and it's a real desktop/mobile app.

### Numbers (because I'd want them)

- **5,423 words** with 100% coverage across school levels (primary → CET-6 → GRE-style vocab)
- **1,941 unit tests + 23 e2e specs** covering critical paths
- **42 weekly reviews** during dev, with **28+ independent verifiers** doing adversarial audits
- **Lighthouse**: perf 0.89 / **a11y 1.00 (perfect)** / LCP 1.7s
- **0 emojis hardcoded** (everything is custom inline SVG, 30 icons)
- **0 network calls** for telemetry/feedback/NPS — all stored in IndexedDB
- **5,000+ words dictionary** lazy-loaded (single chunk ~196KB on demand, not 6.3MB upfront)

### Features (8)

1. Word library (5,423 words, alphabet index, fuzzy search)
2. Pronunciation eval (Web Speech API)
3. Spaced repetition (FSRS algorithm)
4. Error review (mistakes from writing/AI chat)
5. Writing correction (paste text, AI helps you)
6. AI conversation (multi-vendor support, no markups)
7. Learning heatmap (GitHub-style)
8. Weekly report (7-day summary, shareable)

### Tech stack

- React 18 + TypeScript + Vite
- Dexie (IndexedDB)
- React Router
- Service Worker (Workbox)
- **Zero paid services, zero API keys required**
- ~150KB gzipped main bundle, lazy chunks for everything else

### Why I'm posting

I want **5-10 people to actually use it for a week** (not 30 seconds). If you:

- Actually use it (the home page → "今日学 5 词" → 3 steps → 5 minutes path)
- Send real feedback (in-app feedback button, or GitHub issue)
- Won't sugar-coat if you don't like something

I'll:
- Reply to every piece of feedback for the next week
- Your name in README acknowledgments (if you want)
- Forever Pro (currently $0 anyway, so just a thank-you)

### Screenshots

**Home**
![Home](https://lingoo12138.github.io/english-app/screenshots/w149/01-home.png)

**Word library (5,423 words, alphabet index)**
![WordList](https://lingoo12138.github.io/english-app/screenshots/w149/02-wordlist.png)

**Word detail (definition + roots + phrases + AI usage)**
![WordDetail](https://lingoo12138.github.io/english-app/screenshots/w149/03-worddetail.png)

**Usage dashboard (privacy-first, all data local)**
![Usage](https://lingoo12138.github.io/english-app/screenshots/w149/05-usage.png)

**Dark mode**
![Home Dark](https://lingoo12138.github.io/english-app/screenshots/w149/07-home-dark.png)

---

Open the link, no signup, no install needed. Just click and use.

Happy to answer any questions about the architecture, testing, or design decisions.
