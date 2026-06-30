const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const searchQuery = process.env.SEARCH_QUERY || "restaurants in Lahore";
  
  console.log(`Phase 1: Finding businesses for '${searchQuery}'...`);
  await page.goto('https://www.google.com/maps');
  
  const searchBox = page.locator('#searchboxinput, input[name="q"]').first();
  await searchBox.waitFor({ state: 'visible', timeout: 60000 });
  await searchBox.fill(searchQuery);
  await searchBox.press('Enter');

  const feedSelector = 'div[role="feed"]';
  await page.waitForSelector(feedSelector, { timeout: 60000 });

  // Scroll the main search feed to get initial list
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
      await page.waitForTimeout(3000); 

      // Aggressive Foreground scrolling
      await page.mouse.move(200, 400);
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(1000);
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(1000);

      await page.evaluate(async () => {
        const panes = document.querySelectorAll('.m6QErb');
        const scrollablePane = Array.from(panes).find(p => p.scrollHeight > p.clientHeight && p.clientHeight > 0);
        if (scrollablePane) {
            scrollablePane.scrollTo(0, scrollablePane.scrollHeight);
            await new Promise(r => setTimeout(r, 1000));
        }
      });
      
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

      const mapsLink = page.url(); // Grabs the exact Google Maps URL for this specific business

      // --- DEEP LINK EXTRACTION FROM WEB RESULTS PANE ---
      const mapsContactData = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const socials = [];
        const emails = [];

        anchors.forEach(a => {
          const href = a.href ? a.href.toLowerCase() : '';
          const text = a.innerText ? a.innerText.toLowerCase() : '';
          
          const isSocialUrl = href.includes('instagram.com') || href.includes('facebook.com') || 
                             href.includes('linkedin.com') || href.includes('twitter.com') || 
                             href.includes('x.com') || href.includes('tiktok.com') ||
                             text.includes('facebook.com') || text.includes('instagram.com');

          if (isSocialUrl) {
            if (!href.includes('google.com/share') && !href.includes('search?q=')) {
                socials.push(a.href || a.innerText);
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

      console.log(`[Lead ${i+1}] ${lead.name} -> Socials Extracted: ${mapsContactData.socials.length}`);

      finalLeads.push({ 
          Company: lead.name, 
          Phone: phone, 
          Website: website, 
          Emails: mapsContactData.emails, 
          SocialLinks: mapsContactData.socials,
          MapsLink: lead.url,
          Maps_Link: mapsLink
      });
      
    } catch (error) {
        console.log(`⚠️ Optimization skip on lead index: ${i}`);
    }
  }

  fs.writeFileSync('leads.json', JSON.stringify(finalLeads, null, 2));
  await browser.close();
})();