// --- NEW: UNLOCK THE SECRETS VAULT ---
require('dotenv').config();
const fs = require('fs');

console.log("\n=== Building Bulk Contact File (VCF) ===");

if (!fs.existsSync('qualified_leads.json')) {
    console.log("❌ Error: qualified_leads.json not found.");
    process.exit(1);
}

const leads = JSON.parse(fs.readFileSync('qualified_leads.json'));
let vcfContent = "";
let savedCount = 0;

const cleanPhone = (phoneStr) => {
    if (!phoneStr || phoneStr === "No Phone") return null;
    let cleaned = phoneStr.replace(/\D/g, ''); 
    if (cleaned.startsWith('03')) cleaned = '92' + cleaned.substring(1);
    if (cleaned.startsWith('3')) cleaned = '92' + cleaned;
    return "+" + cleaned; 
};

leads.forEach(lead => {
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
console.log(`✅ Successfully packed ${savedCount} contacts into bulk_leads.vcf!`);

// --- SECURE TELEGRAM PIPELINE ---
// Now it pulls the keys securely from your .env file!
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendToPhone() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error("❌ Error: Telegram credentials are missing from your .env file!");
        return;
    }

    console.log("\n🚀 Beaming file directly to your phone via Telegram...");
    
    try {
        const fileBuffer = fs.readFileSync('bulk_leads.vcf');
        const blob = new Blob([fileBuffer], { type: 'text/vcard' });
        
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('document', blob, 'Daily_Leads.vcf');
        formData.append('caption', `✅ Fresh leads generated! Tap the file above to save ${savedCount} contacts to your phone.`);

        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.ok) {
            console.log(`✅ SUCCESS! Check your Telegram app right now.`);
        } else {
            console.error(`❌ Telegram failed:`, result.description);
        }
    } catch (error) {
        console.error("❌ Network Error:", error.message);
    }
}

sendToPhone();