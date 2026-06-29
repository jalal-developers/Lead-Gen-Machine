# 🚀 Automated B2B Lead-Gen-Machine (Cloud Edition)

A high-performance, fully automated B2B lead generation and website auditing pipeline built with Node.js, Playwright, and GitHub Actions.

Instead of just scraping raw contact data, this machine acts as a highly intelligent, autonomous digital sales assistant. It crawls Google Maps for local businesses, bypasses basic bot protection to deeply audit their websites, scores them based on technical flaws (like missing SSL or broken mobile layouts), compiles the data into a native Excel CRM, and **beams the contacts directly to your phone via Telegram every morning.**

## ✨ Key Features

* **Google Maps Spider:** Automatically scrolls and extracts business names, Maps URLs, and external website links based on a dynamic user search query.
* **Smart Segmentation:** Separates businesses that don't have a website from those that do, allowing for hyper-targeted outreach campaigns.
* **Deep Technical Auditing:** Evaluates live websites for mobile optimization, SSL security, tech stack detection (Shopify, WordPress, React), WhatsApp checkout integration, and basic SEO.
* **Native Excel CRM Export:** Automatically compiles the raw JSON data into a beautifully formatted `leads_crm.xlsx` spreadsheet for immediate review.
* **Bulk VCF Generation:** Merges both "needs redesign" and "needs new website" leads into a single `.vcf` file, allowing you to save dozens of contacts to your phone in one tap.
* **Telegram Bot Pipeline:** Bypasses local network restrictions to instantly message your physical phone with the daily `.vcf` contact file and the `.xlsx` CRM.
* **CI/CD Cloud Automation:** Powered by GitHub Actions, the entire pipeline runs completely headless in the cloud every morning, dropping fresh leads into your hands while you sleep.

## 🏗️ Architecture & Pipeline

The machine operates in sequential phases, orchestrated by a master controller:

1.  **`crawler.js` (The Extractor):** Launches a Chromium browser, navigates to Google Maps, injects search queries, and scrapes the infinite-scroll feed for initial targets.
2.  **`filter.js` (The Sorter):** Processes the raw JSON output and splits the data into businesses needing full builds vs. businesses needing redesigns/audits.
3.  **`auditor.js` (The Evaluator):** Employs a stealth browser context to penetrate bot protection. It reads the DOM of each target, grades the site, extracts emails/socials, and filters out perfectly built sites.
4.  **`run.js` (The Master Node):** Executes the scripts sequentially, handles file system garbage collection, and generates the final Excel CRM.
5.  **`vcf_generator.js` (The Courier):** Sweeps the finalized lead files, generates a standard VCard file, securely authenticates with the Telegram API, and beams the deliverables directly to the user's mobile device.

## ⚙️ Installation & Local Setup

### Prerequisites
* Node.js installed on your machine.
* Git for version control.
* A Telegram Bot Token & Chat ID.

### Quick Start

**1. Clone the repository:**
    git clone https://github.com/YourUsername/Lead-Gen-Machine.git
    cd Lead-Gen-Machine

**2. Install dependencies:**
    npm install playwright dotenv
    npx playwright install chromium

**3. Configure Environment Variables:**
Create a `.env` file in the root directory and add your secure API keys:
    HF_API_KEY=your_huggingface_key_here
    TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
    TELEGRAM_CHAT_ID=your_telegram_chat_id_here

*(Note: Ensure `.env` is listed in your `.gitignore` file).*

**4. Run the pipeline locally:**
    node run.js
    node vcf_generator.js

## ☁️ Cloud Deployment (GitHub Actions)

To set up the nightly automated runner:
1. Go to your GitHub Repository **Settings** > **Secrets and variables** > **Actions**.
2. Add your three `.env` variables as **Repository Secrets**.
3. The included `.github/workflows/lead-gen.yml` file is configured to wake up at **5:13 AM (PKT)** every morning, run the full scrape-and-audit pipeline, and send the payload to your Telegram app.

## 📂 Output Files

To protect data privacy, scraped leads are ignored via `.gitignore`. Upon successful execution, the machine generates:
* `leads_crm.xlsx`: Your complete daily dashboard of audited businesses.
* `bulk_leads.vcf`: A ready-to-import contact file for mobile devices.
* `needs_new_website.json` & `qualified_leads.json`: Clean JSON arrays used for data processing.

## 👨‍💻 Author

**Jalal Ashraf**
* **Portfolio:** [jalaldev.tech](https://jalaldev.tech)
* **Role:** Full-Stack Web Developer

Feel free to reach out for custom React/Tailwind frontend builds, web automation projects, or technical consulting.

## 📄 License

This project is open-source and available under the MIT License.