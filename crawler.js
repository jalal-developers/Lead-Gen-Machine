const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const searchQuery = process.env.SEARCH_QUERY || "clothing brands in Lahore";
  
  console.log(`Phase 1: Finding businesses for '${searchQuery}'...`);
  await page.goto('https://www.google.com/maps');
  
  const searchBox = page.locator('#searchboxinput, input[name="q"]').first();
  await searchBox.waitFor({ state: 'visible', timeout: 60000 });
  await searchBox.fill(searchQuery);
  await searchBox.press('Enter');

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
    return elements.map(el => ({ url: el.href, name: el.getAttribute('aria-label') || "Unknown" }));
  });

  const uniqueListings = [...new Map(listings.map(item => [item.url, item])).values()];
  const finalLeads = [];

  for (let i = 0; i < uniqueListings.length; i++) {
    const lead = uniqueListings[i];
    try {
      await page.goto(lead.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2500);

      // --- NEW: SCROLL DOWN TO TRIGGER "WEB RESULTS" LAZY LOADING ---
      await page.evaluate(() => {
        // Google Maps uses div[role="main"] for the scrollable sidebar
        const scrollablePanel = document.querySelector('div[role="main"]');
        if (scrollablePanel) {
            scrollablePanel.scrollBy(0, 4000); // Force scroll to the bottom
        }
      });
      
      // Wait for the web results to fetch and render on screen
      await page.waitForTimeout(2000); 

      let website = "No Website";
      let phone = "No Phone";

      const webElement = await page.$('a[data-item-id="authority"]');
      if (webElement) website = await webElement.getAttribute('href');

      const phoneElement = await page.$('button[data-item-id^="phone:tel:"]');
      if (phoneElement) {
        const ariaLabel = await phoneElement.getAttribute('aria-label');
        if (ariaLabel) phone = ariaLabel.replace('Phone number: ', '').trim();
      }

      // EXTRACT SOCIALS & EMAILS 
      const mapsContactData = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const socials = [];
        const emails = [];

        links.forEach(a => {
          const href = a.href.toLowerCase();
          
          if (href.includes('instagram.com') || href.includes('facebook.com') || 
              href.includes('linkedin.com') || href.includes('twitter.com') || 
              href.includes('x.com') || href.includes('tiktok.com')) {
            // Prevent grabbing Google's internal share buttons by mistake
            if(!href.includes('google.com/share')) {
                socials.push(a.href);
            }
          }
          if (href.startsWith('mailto:')) {
            emails.push(href.replace('mailto:', '').split('?')[0]); 
          }
        });

        return { 
            emails: [...new Set(emails)], 
            socials: [...new Set(socials)] 
        };
      });

      finalLeads.push({ 
          Company: lead.name, 
          Phone: phone, 
          Website: website, 
          Emails: mapsContactData.emails, 
          SocialLinks: mapsContactData.socials,
          MapsLink: lead.url 
      });
      
    } catch (error) {}
  }

  fs.writeFileSync('leads.json', JSON.stringify(finalLeads, null, 2));
  await browser.close();
})();