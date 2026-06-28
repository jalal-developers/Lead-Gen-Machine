const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log("Loading leads from needs_redesign.json...");
  const rawData = fs.readFileSync('needs_redesign.json');
  const leads = JSON.parse(rawData);
  
  const qualifiedLeads = []; 

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  console.log(`\n=== Starting Smart Lead Scoring & Contact Audit ===\n`);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const urlLower = lead.Website.toLowerCase();
    
    if (urlLower.includes('facebook.com') || urlLower.includes('instagram.com') || urlLower.includes('youtube.com') || urlLower.includes('tiktok.com')) {
        console.log(`[${i + 1}/${leads.length}] ⏭️  Skipped: ${lead.Company} (Social Media Link)`);
        continue; 
    }

    console.log(`\n[${i + 1}/${leads.length}] 🔍 Analyzing: ${lead.Company} (${lead.Website})`);

    let auditReport = {
      isMobileOptimized: "Unknown", 
      techStack: "Custom/Unknown",
      hasWhatsAppCheckout: false, // UPGRADED: Explicitly checking for eCom checkout
      hasH1: false,
      hasMetaDescription: false,
      unoptimizedImages: 0,
      hasSSL: true, 
      emailsFound: [],      
      socialLinks: [],      
      status: "Successfully Scanned",
      flawScore: 0
    };

    try {
      await page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000); 
      await page.goto(lead.Website, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4000); 

      // --- FIXED: SSL CHECK VIA FINAL DESTINATION PROTOCOL ---
      // Instead of reading the raw text link, we check where the browser actually landed
      const finalDestinationUrl = page.url().toLowerCase();
      if (finalDestinationUrl.startsWith('https://')) {
          auditReport.hasSSL = true;
      } else {
          auditReport.hasSSL = false; // Truly insecure if it stayed on http://
      }

      // --- UPGRADED: TARGETED WHATSAPP CHECKOUT DETECTION ---
      auditReport.hasWhatsAppCheckout = await page.evaluate(() => {
        const actionableElements = Array.from(document.querySelectorAll('a, button, form, span'));
        const checkoutKeywords = ['order', 'buy', 'checkout', 'cart', 'خرید', 'آرڈر'];
        
        return actionableElements.some(el => {
          const text = (el.innerText || el.textContent || '').toLowerCase();
          const href = el.href ? el.href.toLowerCase() : '';
          
          const connectsToWhatsapp = href.includes('wa.me') || href.includes('api.whatsapp.com') || text.includes('whatsapp');
          const intentIsCheckout = checkoutKeywords.some(keyword => text.includes(keyword));
          
          return connectsToWhatsapp && intentIsCheckout;
        });
      });

      // Extract Contact Data
      const websiteContactData = await page.evaluate(() => {
        const text = document.body.innerText;
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        let emails = text.match(emailRegex) || [];

        const links = Array.from(document.querySelectorAll('a'));
        const socials = [];

        links.forEach(a => {
          const href = a.href.toLowerCase();
          if (href.startsWith('mailto:')) emails.push(href.replace('mailto:', '').split('?')[0]); 
          if (href.includes('instagram.com') || href.includes('facebook.com') || 
              href.includes('linkedin.com') || href.includes('twitter.com') || 
              href.includes('x.com') || href.includes('tiktok.com')) {
            socials.push(a.href);
          }
        });

        return { emails, socials };
      });

      auditReport.emailsFound = [...new Set([...(lead.Emails || []), ...websiteContactData.emails])];
      auditReport.socialLinks = [...new Set([...(lead.SocialLinks || []), ...websiteContactData.socials])];

      // Mobile Responsiveness Check
      auditReport.isMobileOptimized = false; 
      const viewport = await page.$('meta[name="viewport"]');
      if (viewport) {
        const content = await viewport.getAttribute('content');
        if (content && content.includes('width=device-width')) auditReport.isMobileOptimized = true;
      }

      // Tech Stack Detection
      const htmlCode = await page.content();
      if (htmlCode.includes('wp-content') || htmlCode.includes('wordpress')) auditReport.techStack = 'WordPress';
      else if (htmlCode.includes('cdn.shopify.com') || htmlCode.includes('Shopify')) auditReport.techStack = 'Shopify';
      else if (htmlCode.includes('wix.com')) auditReport.techStack = 'Wix';
      else if (htmlCode.includes('react') || htmlCode.includes('_next')) auditReport.techStack = 'React / Next.js';

      // Basic SEO Checks
      const h1Count = await page.locator('h1').count();
      auditReport.hasH1 = h1Count > 0;
      const metaDesc = await page.$('meta[name="description"]');
      auditReport.hasMetaDescription = metaDesc !== null;

      // Performance Check
      auditReport.unoptimizedImages = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img'));
          return imgs.filter(img => !img.hasAttribute('loading') || img.getAttribute('loading') !== 'lazy').length;
      });

      // CALCULATE FLAW SCORE
      if (auditReport.isMobileOptimized === false) auditReport.flawScore += 50; 
      if (auditReport.hasWhatsAppCheckout === true) auditReport.flawScore += 30; 
      if (auditReport.hasSSL === false) auditReport.flawScore += 40; 
      if (auditReport.hasH1 === false) auditReport.flawScore += 5;
      if (auditReport.hasMetaDescription === false) auditReport.flawScore += 5;
      if (auditReport.unoptimizedImages > 10) auditReport.flawScore += 10;

      console.log(`    🔒 SSL Security:      ${auditReport.hasSSL ? '✅ Secure (HTTPS)' : '❌ INSECURE (HTTP)'}`);
      console.log(`    📱 Mobile Optimized:  ${auditReport.isMobileOptimized ? '✅ Yes' : '❌ NO'}`);
      console.log(`    🛍️  WhatsApp Checkout: ${auditReport.hasWhatsAppCheckout ? '✅ YES (Target Brand)' : '❌ No'}`);
      console.log(`    📧 Emails Scraped:    ${auditReport.emailsFound.length > 0 ? auditReport.emailsFound.join(', ') : 'None'}`);
      console.log(`    🌐 Social Links:      ${auditReport.socialLinks.length > 0 ? auditReport.socialLinks.length + ' Profile(s) Found' : 'None'}`);
      console.log(`    ⚙️  Tech Stack:       ${auditReport.techStack}`);

    } catch (error) {
      auditReport.status = "Failed to load / Severe Bot Protection";
      console.log(`    ⚠️ Could not load website (Severe Bot Protection or Dead Link).`);
    }

    // Target leads that are broken on mobile, missing real SSL, OR using a raw WhatsApp checkout setup
    const isTargetLead = (auditReport.isMobileOptimized === false) || (auditReport.hasWhatsAppCheckout === true) || (auditReport.hasSSL === false);

    if (isTargetLead && auditReport.status !== "Failed to load / Severe Bot Protection") {
        console.log(`    🎯 LEAD QUALIFIED (Score: ${auditReport.flawScore}) - Adding to final list.`);
        qualifiedLeads.push({ ...lead, Audit: auditReport });
    } else if (auditReport.status === "Successfully Scanned") {
        console.log(`    🚫 Passed Audit (No critical flaws). Ignoring and deleting from list.`);
    }
  }

  fs.writeFileSync('qualified_leads.json', JSON.stringify(qualifiedLeads, null, 2));
  console.log(`\n=== Filtering Complete! You have ${qualifiedLeads.length} highly qualified leads saved to qualified_leads.json ===`);

  await browser.close();
})();