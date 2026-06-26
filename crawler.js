const { chromium } = require('playwright');
const fs = require('fs'); // We need this to save your leads to a file

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Pull the search query from the environment variable, or use a default if none is provided
const searchQuery = process.env.SEARCH_QUERY || "clothing brands in Lahore";
  console.log(`Phase 1: Finding businesses for '${searchQuery}'...`);

  await page.goto('https://www.google.com/maps');
  
  const searchBox = page.locator('#searchboxinput, input[name="q"]').first();
  await searchBox.waitFor({ state: 'visible', timeout: 60000 });
  await searchBox.fill(searchQuery);
  await searchBox.press('Enter');

  console.log("Scrolling the feed to load results...");
  const feedSelector = 'div[role="feed"]';
  await page.waitForSelector(feedSelector, { timeout: 60000 });

  for (let i = 0; i < 5; i++) {
    await page.evaluate((selector) => {
      const feed = document.querySelector(selector);
      if (feed) feed.scrollTo(0, feed.scrollHeight);
    }, feedSelector);
    await page.waitForTimeout(3000);
  }

  const listings = await page.$$eval('a[href*="https://www.google.com/maps/place"]', (elements) => {
    return elements.map(el => ({
      url: el.href,
      name: el.getAttribute('aria-label') || "Unknown Business"
    }));
  });

  const uniqueListings = [...new Map(listings.map(item => [item.url, item])).values()];
  console.log(`\n=== Found ${uniqueListings.length} businesses. Starting Phase 2: Deep Scrape ===\n`);

  const finalLeads = [];

  // Phase 2: Visit each URL to extract the Website and Phone Number
  for (let i = 0; i < uniqueListings.length; i++) {
    const lead = uniqueListings[i];
    console.log(`[${i + 1}/${uniqueListings.length}] Checking: ${lead.name}`);
    
    try {
      // Navigate to the specific business page
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2500); // Allow sidebar data to populate

      let website = "No Website";
      let phone = "No Phone";

      // Extract Website
      const webElement = await page.$('a[data-item-id="authority"]');
      if (webElement) {
        website = await webElement.getAttribute('href');
      }

      // Extract Phone Number
      const phoneElement = await page.$('button[data-item-id^="phone:tel:"]');
      if (phoneElement) {
        const ariaLabel = await phoneElement.getAttribute('aria-label');
        if (ariaLabel) {
           phone = ariaLabel.replace('Phone number: ', '').trim();
        }
      }

      finalLeads.push({
        Company: lead.name,
        Phone: phone,
        Website: website,
        MapsLink: lead.url
      });

      console.log(`    -> Web: ${website} | Phone: ${phone}`);
    } catch (error) {
      console.log(`    -> Skipped (Failed to load page in time)`);
    }
  }

  // Phase 3: Save the data locally
  console.log("\n=== Scraping Complete! Saving to leads.json ===");
  fs.writeFileSync('leads.json', JSON.stringify(finalLeads, null, 2));
  console.table(finalLeads);

  await browser.close();
})();