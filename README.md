# Lead Gen Machine

A Node.js + Playwright pipeline that:
1. Scrapes business leads from Google Maps
2. Splits leads into `needs_redesign.json` and `needs_new_website.json`
3. Audits redesign candidates and outputs `qualified_leads.json`

## Requirements

- Node.js 18+
- npm

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

You will be prompted for a niche and city (example: `plumbers in Karachi`).

## Available Scripts

- `npm start` - Runs the full pipeline (`run.js`)
- `npm run crawl` - Only run the Maps crawler (`crawler.js`)
- `npm run filter` - Only split leads into redesign/new website lists (`filter.js`)
- `npm run audit` - Only run the website audit (`auditor.js`)

## Output Files

- `needs_new_website.json`
- `qualified_leads.json`
