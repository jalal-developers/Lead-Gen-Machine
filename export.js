const ExcelJS = require('exceljs');
const fs = require('fs');

console.log("\n=== Starting Native Excel CRM Export Phase ===");

(async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Qualified Leads');

    worksheet.columns = [
        { header: 'Category', key: 'category', width: 22 },
        { header: 'Company Name', key: 'company', width: 30 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Website', key: 'website', width: 30 },
        { header: 'Google Maps Link', key: 'mapsLink', width: 40 },
        { header: 'Load Time', key: 'loadTime', width: 14 }, 
        
        { header: 'SSL Secure?', key: 'ssl', width: 15 },
        { header: 'Mobile Optimized?', key: 'mobile', width: 18 },
        { header: 'WhatsApp Checkout?', key: 'whatsappCheck', width: 20 },
        { header: 'Has H1 Tag?', key: 'h1', width: 15 },
        { header: 'Meta Description?', key: 'metaDesc', width: 18 },
        { header: 'Flaw Score', key: 'flawScore', width: 14 },
        
        { header: 'Emails', key: 'emails', width: 35 },
        { header: 'Social Links', key: 'socials', width: 45 },
        { header: 'Facebook?', key: 'facebook', width: 12 },
        { header: 'Instagram?', key: 'instagram', width: 12 },
        { header: 'LinkedIn?', key: 'linkedin', width: 12 },
        { header: 'Social Links (JSON)', key: 'socialLinksJson', width: 30 },
        { header: 'WhatsApp 1-Click Link', key: 'waLink', width: 25 },
        { header: 'Pre-Written Pitch', key: 'pitch', width: 80 },
        { header: 'Screenshot Path', key: 'screenshot', width: 35 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF004B87' } 
    };

    const cleanPhone = (phoneStr) => {
        if (!phoneStr || phoneStr === "No Phone") return "";
        let cleaned = phoneStr.replace(/\D/g, ''); 
        if (cleaned.startsWith('03')) cleaned = '92' + cleaned.substring(1);
        if (cleaned.startsWith('3')) cleaned = '92' + cleaned;
        return cleaned;
    };

    const processLeads = (filename, category, fallbackPitchTemplate) => {
        if (!fs.existsSync(filename)) return;
        
        const rawData = fs.readFileSync(filename);
        if (rawData.length === 0) return;
        
        const leads = JSON.parse(rawData);

        leads.forEach(lead => {
            const phoneClean = cleanPhone(lead.Phone);
            let customPitch = fallbackPitchTemplate.replace('[Company]', lead.Company);
            
            let speedMetric = "N/A";
            let sslStatus = "N/A";
            let mobileStatus = "N/A";
            let whatsappCheckStatus = "N/A";
            let h1Status = "N/A";
            let metaDescStatus = "N/A";
            let scoreMetric = 0;
            
            if (lead.Audit) {
                speedMetric = `${lead.Audit.loadTime || 0}s`;
                sslStatus = lead.Audit.hasSSL ? "✅ Yes" : "❌ No";
                mobileStatus = lead.Audit.isMobileOptimized ? "✅ Yes" : "❌ No";
                whatsappCheckStatus = lead.Audit.hasWhatsAppCheckout ? "✅ Yes" : "❌ No";
                h1Status = lead.Audit.hasH1 ? "✅ Yes" : "❌ No";
                metaDescStatus = lead.Audit.hasMetaDescription ? "✅ Yes" : "❌ No";
                scoreMetric = lead.Audit.flawScore || 0;

                const isSlow = lead.Audit.loadTime > 4.0;
                const runsAds = lead.Audit.runsAds;
                const dynamicCompliment = lead.Audit.aiCompliment || "I love what you guys are building.";

                // --- NEW: THE BROKEN WEBSITE PITCH LOGIC ---
                if (lead.Audit.status && lead.Audit.status.includes("Down")) {
                    speedMetric = "⚠️ TIMEOUT";
                    sslStatus = "❌ DOWN";
                    mobileStatus = "❌ DOWN";
                    whatsappCheckStatus = "❌ DOWN";
                    h1Status = "❌ DOWN";
                    metaDescStatus = "❌ DOWN";
                    
                    customPitch = `Hello ${lead.Company} team! I was just trying to check out your products/services, but your website is currently down and throwing an error page. You are likely losing traffic and buyers right now. I build high-speed, secure React stores with 1-click WhatsApp checkout. Would you like me to help get your digital storefront back online quickly?`;
                } 
                else if (runsAds && isSlow) {
                    customPitch = `Hello ${lead.Company} team! ${dynamicCompliment} I noticed you are currently running paid ads, but your website takes a massive ${lead.Audit.loadTime} seconds to load. You are paying for traffic but likely losing customers to slow load times before they see your products. I built a high-speed React prototype for you that loads instantly with a 1-click WhatsApp checkout. Check it out here: https://pkgarments-demo.netlify.app/ Let me know what you think!`;
                } else if (runsAds) {
                    customPitch = `Hello ${lead.Company} team! ${dynamicCompliment} I noticed you are currently running paid ads, but your website is throwing checkout errors. You are paying for traffic but likely losing buyers at the final step. I built a high-speed React prototype for you with a seamless 1-click WhatsApp checkout to stop the cash bleed. Check it out here: https://pkgarments-demo.netlify.app/ Let me know what you think!`;
                } else if (isSlow) {
                    customPitch = `Hello ${lead.Company} team! ${dynamicCompliment} I did a quick performance test and noticed your website takes ${lead.Audit.loadTime} seconds to load. Amazon found that every 1 second of delay costs 7% in sales. I built a high-speed React prototype for you with a 1-click WhatsApp checkout to fix this. Check it out here: https://pkgarments-demo.netlify.app/ Let me know what you think!`;
                } else {
                    customPitch = `Hello ${lead.Company} team! ${dynamicCompliment} I did a quick technical check and noticed your current website has some checkout/mobile layout issues. I built a high-speed React prototype for you with a 1-click WhatsApp checkout. Check it out here: https://pkgarments-demo.netlify.app/ Let me know what you think!`;
                }
            }
            
            let waLinkData = "No Phone";
            if (phoneClean) {
                const fullUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(customPitch)}`;
                waLinkData = { text: '📲 Send Message', hyperlink: fullUrl };
            }

            const emailsList = lead.Audit && lead.Audit.emailsFound ? lead.Audit.emailsFound : (lead.Emails || []);
            const emails = emailsList.length > 0 ? emailsList.join(' | ') : 'None';

            const socialsList = lead.Audit && lead.Audit.socialLinks ? lead.Audit.socialLinks : (lead.SocialLinks || []);
            const socials = socialsList.length > 0 ? socialsList.join(' | ') : 'None';

            const facebook = lead.Facebook || 'No';
            const instagram = lead.Instagram || 'No';
            const linkedin = lead.LinkedIn || 'No';
            const socialLinksJson = lead.Social_Links || 'None';
            const screenshot = lead.Audit && lead.Audit.screenshotPath ? lead.Audit.screenshotPath : 'None';

            const row = worksheet.addRow({
                category: category,
                company: lead.Company,
                phone: lead.Phone,
                website: lead.Website,
                mapsLink: lead.MapsLink || 'None',
                loadTime: speedMetric,
                ssl: sslStatus,
                mobile: mobileStatus,
                whatsappCheck: whatsappCheckStatus,
                h1: h1Status,
                metaDesc: metaDescStatus,
                flawScore: scoreMetric,
                emails: emails,
                socials: socials,
                facebook: facebook,
                instagram: instagram,
                linkedin: linkedin,
                socialLinksJson: socialLinksJson,
                waLink: waLinkData,
                pitch: customPitch,
                screenshot: screenshot
            });

            if (phoneClean) {
                row.getCell('waLink').font = { color: { argb: 'FF0563C1' }, underline: true };
            }
        });
    };

    const noWebsitePitch = "Hello [Company] team! I noticed you are running a great brand in Lahore but don't have a dedicated website yet. I build custom React online stores that connect directly to WhatsApp for easy ordering. I built a live demo so you can see how it works: https://pkgarments-demo.netlify.app/ Would you be open to a quick chat?";
    const needsAuditPitch = "Hello [Company] team! I love what you guys are building. I did a quick technical check and noticed your current website has some checkout/mobile speed issues. I built a high-speed React prototype for you with a 1-click WhatsApp checkout. Check it out here: https://pkgarments-demo.netlify.app/ Let me know what you think!";

    processLeads('needs_new_website.json', 'No Website', noWebsitePitch);
    processLeads('qualified_leads.json', 'Needs Redesign/Audit', needsAuditPitch);

    await workbook.xlsx.writeFile('leads_crm.xlsx');
    console.log("✅ Successfully exported beautifully formatted data to leads_crm.xlsx");

})();