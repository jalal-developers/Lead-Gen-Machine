require('dotenv').config();
const fs = require('fs');

console.log("\n=== Building Bulk Contact File (VCF) ===");

let allLeads = [];

// 1. Grab businesses that HAVE websites (Redesigns/Audits)
if (fs.existsSync('qualified_leads.json')) {
    const qualifiedLeads = JSON.parse(fs.readFileSync('qualified_leads.json'));
    allLeads = allLeads.concat(qualifiedLeads);
    console.log(`🔍 Found ${qualifiedLeads.length} leads that need a redesign/audit.`);
}

// 2. Grab businesses that DO NOT have websites (New Websites)
if (fs.existsSync('needs_new_website.json')) {
    const noWebsiteLeads = JSON.parse(fs.readFileSync('needs_new_website.json'));
    allLeads = allLeads.concat(noWebsiteLeads);
    console.log(`🔍 Found ${noWebsiteLeads.length} leads that need a brand new website.`);
}

if (allLeads.length === 0) {
    console.log("❌ Error: No leads found in either JSON file.");
    process.exit(1);
}

let vcfContent = "";
let savedCount = 0;

const cleanPhone = (phoneStr) => {
    if (!phoneStr || phoneStr === "No Phone") return null;
    let cleaned = phoneStr.replace(/\D/g, ''); 
    if (cleaned.startsWith('03')) cleaned = '92' + cleaned.substring(1);
    if (cleaned.startsWith('3')) cleaned = '92' + cleaned;
    return "+" + cleaned; 
};

// 3. Process ALL leads into the VCF
allLeads.forEach(lead => {
    const phone = cleanPhone(lead.Phone);
    if (phone) {
        vcfContent += "BEGIN:VCARD\nVERSION:3.0\n";
        vcfContent += `FN:Lead - ${lead.Company}\n`; 
        vcfContent += `ORG:${lead.Company}\n`;
        vcfContent += `TEL;TYPE=CELL:${phone}\n`;
        vcfContent += "END:VCARD\n\n";
        savedCount++;
    }
});

fs.writeFileSync('bulk_leads.vcf', vcfContent);
console.log(`✅ Successfully packed a total of ${savedCount} contacts into bulk_leads.vcf!`);

// --- SECURE TELEGRAM PIPELINE ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendToTelegram() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error("❌ Error: Telegram credentials are missing from your .env file!");
        return;
    }

    console.log("\n🚀 Beaming files directly to your phone via Telegram...");
    
    // Send the VCF File
    try {
        const vcfBuffer = fs.readFileSync('bulk_leads.vcf');
        const vcfBlob = new Blob([vcfBuffer], { type: 'text/vcard' });
        
        const vcfFormData = new FormData();
        vcfFormData.append('chat_id', TELEGRAM_CHAT_ID);
        vcfFormData.append('document', vcfBlob, 'Daily_Leads.vcf');
        vcfFormData.append('caption', `✅ Fresh leads generated! Tap to save ${savedCount} total contacts (Includes both Redesign & New Website leads).`);

        console.log("📤 Sending VCF Contacts...");
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: vcfFormData
        });
        console.log(`✅ Contacts delivered!`);
    } catch (error) {
        console.error("❌ Failed to send VCF:", error.message);
    }

    // Send the Excel CRM File
    try {
        if (fs.existsSync('leads_crm.xlsx')) {
            const excelBuffer = fs.readFileSync('leads_crm.xlsx');
            const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const excelFormData = new FormData();
            excelFormData.append('chat_id', TELEGRAM_CHAT_ID);
            excelFormData.append('document', excelBlob, 'leads_crm.xlsx');
            excelFormData.append('caption', `📊 Here is your Daily CRM Dashboard!`);

            console.log("📤 Sending Excel CRM...");
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: excelFormData
            });
            console.log(`✅ Excel CRM delivered!`);
        } else {
            console.log("⚠️ leads_crm.xlsx not found. Skipping Excel upload.");
        }
    } catch (error) {
        console.error("❌ Failed to send Excel file:", error.message);
    }
}

sendToTelegram();