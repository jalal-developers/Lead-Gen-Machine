require('dotenv').config();
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const fs = require('fs');
const path = require('path');

const apiKey = process.env.HF_API_KEY;

(async () => {
  console.log("Loading leads from needs_redesign.json...");
  const rawData = fs.readFileSync('needs_redesign.json');
  const leads = JSON.parse(rawData);
  
  const qualifiedLeads = []; 

  const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  console.log(`\n=== Starting AI-Powered Audit & Profiling ===\n`);
  
  const geminiKey = process.env.GEMINI_API_KEY;
  const hfKey = process.env.HF_API_KEY;

  if (!geminiKey && !hfKey) {
      console.log("💡 Note: No API keys (GEMINI_API_KEY or HF_API_KEY) found in your .env file.");
      console.log("💡 The bot will use the free, keyless Pollinations AI API for personalization.\n");
  } else {
      console.log(`💡 AI configured with: ${geminiKey ? 'Gemini' : ''}${geminiKey && hfKey ? ' & ' : ''}${hfKey ? 'Hugging Face' : ''}\n`);
  }

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
      hasWhatsAppCheckout: false, 
      hasH1: false,
      hasMetaDescription: false,
      unoptimizedImages: 0,
      hasSSL: true, 
      runsAds: false, 
      loadTime: 0.0, 
      emailsFound: [],      
      socialLinks: [],   
      screenshotPath: "None", 
      aiCompliment: "I love what you guys are building.", 
      status: "Successfully Scanned",
      flawScore: 0
    };

    try {
      await page.waitForTimeout(Math.floor(Math.random() * 2000) + 1000); 
      
      const startTime = Date.now();
      await page.goto(lead.Website, { waitUntil: 'domcontentloaded', timeout: 40000 });
      const loadTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      auditReport.loadTime = Number(loadTimeSeconds);

      await page.waitForTimeout(4000); 

      if (page.url().toLowerCase().startsWith('https://')) auditReport.hasSSL = true;
      else auditReport.hasSSL = false; 

      const websiteTextSnippet = await page.evaluate(() => {
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc && metaDesc.content) return metaDesc.content;
          return document.body.innerText.substring(0, 400).replace(/\n/g, ' '); 
      });

      if (websiteTextSnippet.length > 10) {
          let aiSuccess = false;
          const prompt = `You are a friendly web developer sending a cold text to a local business called ${lead.Company}. Write a short, casual, one-sentence compliment (under 12 words) about their business based on this text from their website: "${websiteTextSnippet}". Do not use hashtags, quotes, or robotic language. Sound like a normal human.`;

          // 1. Try Gemini
          if (geminiKey) {
              console.log(`    ⏳ Trying Gemini AI...`);
              try {
                  const response = await fetch(
                      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
                      {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                              contents: [{ parts: [{ text: prompt }] }],
                              generationConfig: { maxOutputTokens: 30, temperature: 0.7 }
                          })
                      }
                  );
                  if (response.ok) {
                      const result = await response.json();
                      if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                          let rawCompliment = result.candidates[0].content.parts[0].text.trim();
                          auditReport.aiCompliment = rawCompliment.replace(/^["']|["']$/g, '');
                          console.log(`    🧠 Gemini Generated Pitch: "${auditReport.aiCompliment}"`);
                          aiSuccess = true;
                      }
                  } else {
                      console.log(`    ⚠️ Gemini API returned status ${response.status}`);
                  }
              } catch (e) {
                  console.log(`    ⚠️ Gemini API call failed: ${e.message}`);
              }
          }

          // 2. Try Hugging Face
          if (!aiSuccess && hfKey) {
              console.log(`    ⏳ Trying Hugging Face AI...`);
              let attempts = 0;
              while (attempts < 2 && !aiSuccess) {
                  try {
                      const response = await fetch(
                          "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
                          {
                              headers: { Authorization: `Bearer ${hfKey}`, "Content-Type": "application/json" },
                              method: "POST",
                              body: JSON.stringify({
                                  inputs: `[INST] ${prompt} [/INST]`,
                                  parameters: { max_new_tokens: 30, return_full_text: false, temperature: 0.7 }
                              }),
                          }
                      );
                      const result = await response.json();
                      if (result.error && result.estimated_time) {
                          const waitTime = Math.ceil(result.estimated_time) + 2; 
                          console.log(`    💤 HF AI is asleep. Waiting ${waitTime} seconds...`);
                          await page.waitForTimeout(waitTime * 1000);
                          attempts++;
                      } else if (result && result[0] && result[0].generated_text) {
                          let rawCompliment = result[0].generated_text.trim();
                          auditReport.aiCompliment = rawCompliment.replace(/^["']|["']$/g, '');
                          console.log(`    🧠 HF AI Generated Pitch: "${auditReport.aiCompliment}"`);
                          aiSuccess = true;
                      } else {
                          break;
                      }
                  } catch (e) {
                      console.log(`    ⚠️ Hugging Face API call failed: ${e.message}`);
                      break; 
                  }
              }
          }

          // 3. Fallback to Pollinations AI (Keyless Free API)
          if (!aiSuccess) {
              console.log(`    ⏳ Trying Pollinations AI (Keyless Free API)...`);
              try {
                  const response = await fetch("https://text.pollinations.ai/", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                          messages: [{ role: "user", content: prompt }],
                          model: "openai"
                      })
                  });
                  if (response.ok) {
                      const text = await response.text();
                      if (text && text.trim().length > 0) {
                          auditReport.aiCompliment = text.trim().replace(/^["']|["']$/g, '');
                          console.log(`    🧠 Pollinations Generated Pitch: "${auditReport.aiCompliment}"`);
                          aiSuccess = true;
                      }
                  } else {
                      console.log(`    ⚠️ Pollinations API returned status ${response.status}`);
                  }
              } catch (e) {
                  console.log(`    ⚠️ Pollinations API call failed: ${e.message}`);
              }
          }
      }

      auditReport.runsAds = await page.evaluate(() => {
        const html = document.documentElement.innerHTML.toLowerCase();
        return html.includes('fbevents.js') || html.includes('fbq(') || html.includes('googletagmanager.com/gtag/js') || html.includes('gtag(');
      });

      auditReport.hasWhatsAppCheckout = await page.evaluate(() => {
        const actionableElements = Array.from(document.querySelectorAll('a, button, form, span'));
        const checkoutKeywords = ['order', 'buy', 'checkout', 'cart', 'خرید', 'آرڈر'];
        return actionableElements.some(el => {
          const text = (el.innerText || el.textContent || '').toLowerCase();
          const href = el.href ? el.href.toLowerCase() : '';
          return (href.includes('wa.me') || href.includes('api.whatsapp.com') || text.includes('whatsapp')) && checkoutKeywords.some(kw => text.includes(kw));
        });
      });

      const websiteContactData = await page.evaluate(() => {
        const text = document.body.innerText;
        const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        Array.from(document.querySelectorAll('a')).forEach(a => {
          const href = a.href.toLowerCase();
          if (href.startsWith('mailto:')) emails.push(href.replace('mailto:', '').split('?')[0]); 
        });
        return { emails };
      });

      auditReport.emailsFound = [...new Set([...(lead.Emails || []), ...websiteContactData.emails])];

      // --- DEEP SWEEP SOCIAL MEDIA EXTRACTION ---
      const socialData = await page.evaluate(() => {
          // Grab every single <a> tag on the entire website
          const allLinks = Array.from(document.querySelectorAll('a[href]')).map(a => a.href.toLowerCase());
          
          // Search the raw URLs for social domains
          const facebook = allLinks.find(link => link.includes('facebook.com')) || 'None';
          const instagram = allLinks.find(link => link.includes('instagram.com')) || 'None';
          const linkedin = allLinks.find(link => link.includes('linkedin.com')) || 'None';
          const tiktok = allLinks.find(link => link.includes('tiktok.com')) || 'None';
          
          return { facebook, instagram, linkedin, tiktok };
      });

      // Add this to your lead object
      lead.Facebook = socialData.facebook !== 'None' ? 'Yes' : 'No';
      lead.Instagram = socialData.instagram !== 'None' ? 'Yes' : 'No';
      lead.LinkedIn = socialData.linkedin !== 'None' ? 'Yes' : 'No';
      lead.Social_Links = JSON.stringify(socialData); // Saves the actual URLs if you need them

      const activeSocials = Object.values(socialData).filter(url => url !== 'None');
      auditReport.socialLinks = [...new Set([...(lead.SocialLinks || []), ...activeSocials])];

      auditReport.isMobileOptimized = false; 
      const viewport = await page.$('meta[name="viewport"]');
      if (viewport && (await viewport.getAttribute('content')).includes('width=device-width')) auditReport.isMobileOptimized = true;

      const htmlCode = await page.content();
      if (htmlCode.includes('wp-content') || htmlCode.includes('wordpress')) auditReport.techStack = 'WordPress';
      else if (htmlCode.includes('cdn.shopify.com') || htmlCode.includes('Shopify')) auditReport.techStack = 'Shopify';
      else if (htmlCode.includes('react') || htmlCode.includes('_next')) auditReport.techStack = 'React / Next.js';

      auditReport.hasH1 = await page.locator('h1').count() > 0;
      auditReport.hasMetaDescription = await page.$('meta[name="description"]') !== null;
      auditReport.unoptimizedImages = await page.evaluate(() => Array.from(document.querySelectorAll('img')).filter(img => !img.hasAttribute('loading')).length);

      if (!auditReport.isMobileOptimized) auditReport.flawScore += 50; 
      if (auditReport.hasWhatsAppCheckout) auditReport.flawScore += 30; 
      if (!auditReport.hasSSL) auditReport.flawScore += 40; 
      if (!auditReport.hasH1) auditReport.flawScore += 5;
      if (!auditReport.hasMetaDescription) auditReport.flawScore += 5;
      if (auditReport.unoptimizedImages > 10) auditReport.flawScore += 10;
      if (auditReport.loadTime > 4.0) auditReport.flawScore += 20;
      if (auditReport.runsAds && auditReport.flawScore > 0) auditReport.flawScore += 100; 

      const isTargetLead = (!auditReport.isMobileOptimized) || (auditReport.hasWhatsAppCheckout) || (!auditReport.hasSSL) || (auditReport.loadTime > 5.0);

      if (isTargetLead) {
          const safeFileName = lead.Company.replace(/[^a-zA-Z0-9]/g, '_');
          const imagePath = `screenshots/${safeFileName}.png`;
          await page.screenshot({ path: imagePath });
          auditReport.screenshotPath = imagePath; 
      }

      console.log(`    🔒 SSL Security:      ${auditReport.hasSSL ? '✅ Secure (HTTPS)' : '❌ INSECURE (HTTP)'}`);
      console.log(`    📱 Mobile Optimized:  ${auditReport.isMobileOptimized ? '✅ Yes' : '❌ NO'}`);
      console.log(`    💸 Paid Ads Detected: ${auditReport.runsAds ? '⚠️ YES' : '❌ No'}`);
      console.log(`    ⏱️  Load Time:        ${auditReport.loadTime} Seconds`);
      console.log(`    ⚙️  Tech Stack:       ${auditReport.techStack}`);

      if (isTargetLead) {
          console.log(`    🎯 LEAD QUALIFIED (Score: ${auditReport.flawScore})`);
          qualifiedLeads.push({ ...lead, Audit: auditReport });
      } else {
          console.log(`    🚫 Passed Audit (No critical flaws). Ignoring.`);
      }

    } catch (error) {
      auditReport.status = "Website Down / Error";
      auditReport.flawScore += 200; 
      console.log(`    🚨 WEBSITE IS DOWN OR BLOCKED! This is a massive lead! Adding to priority list.`);
      
      // --- NEW: CAPTURE ERROR SCREENSHOT ---
      const safeFileName = lead.Company.replace(/[^a-zA-Z0-9]/g, '_');
      const imagePath = `screenshots/${safeFileName}_ERROR.png`;
      
      try {
          // Attempt to take a picture of whatever broken screen the browser is currently showing
          await page.screenshot({ path: imagePath, timeout: 5000 });
          auditReport.screenshotPath = imagePath;
          console.log(`    📸 Error Evidence Captured: ${imagePath}`);
      } catch (screenshotError) {
          console.log(`    ⚠️ Could not capture screenshot of the error (Browser navigation failure).`);
      }

      qualifiedLeads.push({ ...lead, Audit: auditReport });
    }
  }

  fs.writeFileSync('qualified_leads.json', JSON.stringify(qualifiedLeads, null, 2));
  console.log(`\n=== Filtering Complete! You have ${qualifiedLeads.length} leads saved. ===`);
  await browser.close();
})();