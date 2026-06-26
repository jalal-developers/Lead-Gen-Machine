# 🚀 Automated B2B Lead-Gen-Machine

A high-performance, automated B2B lead generation and website auditing pipeline built with Node.js and Playwright. 

Instead of just scraping raw contact data, this machine acts as a digital sales assistant. It crawls Google Maps for local businesses, filters them, bypasses basic bot protection to deeply audit their websites, scores them based on technical flaws (like missing SSL or broken mobile layouts), and extracts actionable contact information.

## ✨ Key Features

* **Google Maps Spider:** Automatically scrolls and extracts business names, Maps URLs, and external website links based on a dynamic user search query.
* **Smart Segmentation:** Separates businesses that don't have a website from those that do, allowing for hyper-targeted outreach campaigns.
* **Deep Technical Auditing:** Evaluates live websites for:
    * Mobile optimization (viewport tags)
    * Security (HTTP vs HTTPS)
    * Technology stack detection (Shopify, WordPress, Wix, React/Next.js)
    * WhatsApp checkout integration
    * Basic SEO and performance metrics
* **Automated Contact Extraction:** Scrapes raw DOM text for email addresses (Regex/mailto) and parses `href` tags for major social media profiles (LinkedIn, Instagram, Facebook, TikTok).
* **Algorithmic Lead Scoring:** Discards perfectly built websites and only saves highly qualified leads that actually require web development or redesign services.
* **Single-Command Orchestration:** A master terminal interface manages the entire multi-script pipeline and automatically cleans up temporary files.

## 🏗️ Architecture & Pipeline

The machine operates in four sequential phases, orchestrated by a master controller:

1. **`crawler.js` (The Extractor):** Launches a Chromium browser, navigates to Google Maps, injects search queries, and scrapes the infinite-scroll feed for initial targets.
2. **`filter.js` (The Sorter):** Processes the raw JSON output and splits the data into businesses needing full builds vs. businesses needing redesigns/audits.
3. **`auditor.js` (The Evaluator):** Employs a stealth browser context (custom user-agents, viewport sizing) to penetrate bot protection. It reads the DOM of each target, grades the site, extracts emails/socials, and filters out low-value leads.
4. **`run.js` (The Master Node):** Uses Node's `child_process` to execute the scripts sequentially. Provides an interactive CLI for the user to input search parameters and handles file system garbage collection.

## ⚙️ Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) installed on your machine.
* Git for version control.

### Quick Start
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YourUsername/Lead-Gen-Machine.git](https://github.com/YourUsername/Lead-Gen-Machine.git)
   cd Lead-Gen-Machine
   ```

2. **Install dependencies:**
   This project relies on Playwright for browser automation.
   ```bash
   npm install playwright
   npx playwright install chromium
   ```

3. **Run the pipeline:**
   Execute the master controller from your terminal.
   ```bash
   node run.js
   ```
   *The terminal will prompt you for a search query (e.g., "real estate agencies in Dubai"). Type your query, press Enter, and let the machine work.*

## 📂 Output Files

To protect data privacy, scraped leads are ignored via `.gitignore` and remain locally on your machine. Upon successful execution, the machine will generate two clean files:

* `needs_new_website.json`: Businesses operating solely on Google Maps/Social Media.
* `qualified_leads.json`: Businesses with active websites that failed the technical audit (e.g., missing SSL, broken mobile UI), complete with their scraped emails and social links.

## 👨‍💻 Author

**Jalal Ashraf**
* **Portfolio:** [jalaldev.tech](https://jalaldev.tech)
* **Role:** Full-Stack Web Developer

*Feel free to reach out for custom React/Tailwind frontend builds, web automation projects, or technical consulting.*

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).