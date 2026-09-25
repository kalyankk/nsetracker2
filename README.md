# NSE Trader Terminal & Technical Breakout Scanner

A real-time NSE India technical analysis terminal, Inside Bar breakout scanner, EMA momentum, and RSI divergence analyzer optimized for **Android Mobile (PWA)** and **Desktop**, configured for one-click deployment on **GitHub Pages**.

---

## 🚀 Deploying to GitHub Pages

This repository is pre-configured with **relative asset routing (`base: './'`)** and a **GitHub Actions CI/CD workflow** (`.github/workflows/deploy.yml`) to automatically build and deploy your site to GitHub Pages.

### Method 1: Automated Deployment via GitHub Actions (Recommended)

1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy NSE Trader Terminal to GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Every time you push to the `main` branch, the workflow will automatically:
   - Install dependencies.
   - Run `npm run build`.
   - Publish the `dist/` directory to `https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/`.

---

### Method 2: Manual Static Build

If you prefer to deploy manually or to another static host (e.g. Cloudflare Pages, Vercel, Netlify):

```bash
# 1. Build the production bundle
npm run build

# 2. The entire self-contained application will be in the `dist/` directory.
# Upload or deploy the `dist/` folder to your static hosting provider.
```

---

## ⚡ How It Works on GitHub Pages (Static Hosting)

GitHub Pages does not run Node.js backend servers. To ensure 100% functionality with zero CORS errors and instant loading:

- **Dual-Mode Data Architecture**:
  - **Local Development / Node Server**: Uses the built-in Express proxy (`server.ts`) to fetch live quotes directly from Yahoo Finance.
  - **GitHub Pages (Static Host)**: Automatically falls back to the pre-bundled high-fidelity datasets located in `public/data/` (`batch-charts.json` and `stocks/*.json`), containing complete daily candlestick history, OHLCV, 52-week ranges, VWAP, technical indicators, and automated trade setups for all 18 tracked NSE stocks.
- **PWA & Android Mobile Support**:
  - Web App Manifest (`manifest.json`) and Service Worker (`sw.js`) use relative paths, enabling full Android "Add to Home Screen" installation whether deployed at the root domain or a repository subpath (`/<repo-name>/`).
