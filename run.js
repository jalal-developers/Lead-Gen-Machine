const { execSync } = require('child_process');
const fs = require('fs');

console.log("🚀 STARTING THE CLOUD LEAD GENERATION MACHINE...\n");

// Lists of categories and major Pakistani cities for random search query generation
const categories = [
  "Beauty Salon", "Plumber", "Electrician", "Real Estate Agency",
  "Dentist", "Restaurant", "Car Rental", "Gym", "Coffee Shop",
  "Boutique", "Event Planner", "Travel Agency", "Interior Designer",
  "Law Firm", "Accounting Firm", "Spa", "Fitness Center"
];

const cities = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
  "Multan", "Peshawar", "Quetta", "Gujranwala", "Sialkot"
];

// Pick a random category and city
const randomCategory = categories[Math.floor(Math.random() * categories.length)];
const randomCity = cities[Math.floor(Math.random() * cities.length)];

const TARGET_QUERY = `${randomCategory} in ${randomCity}`;

try {
  console.log(`\n▶️ STEP 1: Running Google Maps Crawler for: "${TARGET_QUERY}"...`);
  execSync('node crawler.js', { 
      stdio: 'inherit',
      env: { ...process.env, SEARCH_QUERY: TARGET_QUERY } 
  }); 

  console.log("\n▶️ STEP 2: Filtering Leads...");
  execSync('node filter.js', { stdio: 'inherit' });

  console.log("\n▶️ STEP 3: Running Deep Agency Audit & Taking Screenshots...");
  execSync('node auditor.js', { stdio: 'inherit' });

  console.log("\n▶️ STEP 4: Compiling Data into CSV CRM...");
  execSync('node export.js', { stdio: 'inherit' });

  console.log("\n🧹 STEP 5: Cleaning up temporary files...");
  if (fs.existsSync('leads.json')) fs.unlinkSync('leads.json');
  if (fs.existsSync('needs_redesign.json')) fs.unlinkSync('needs_redesign.json');
 // if (fs.existsSync('qualified_leads.json')) fs.unlinkSync('qualified_leads.json');

  console.log("\n✅ ALL DONE! Your machine has finished running.");

} catch (error) {
  console.error("\n❌ An error occurred during the execution pipeline:", error.message);
}