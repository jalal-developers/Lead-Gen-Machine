const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');

// Set up the terminal interface to ask the user a question
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("🚀 STARTING THE LEAD GENERATION MACHINE...\n");

// Ask the user what they want to search for
rl.question('What business niche and city do you want to scrape? (e.g., "plumbers in Karachi"): ', (searchQuery) => {
  
  // Close the input stream so the rest of the script can run
  rl.close();

  try {
    console.log(`\n▶️ STEP 1: Running Google Maps Crawler for: "${searchQuery}"...`);
    
    // Pass the user's input as an environment variable to crawler.js
    execSync('node crawler.js', { 
        stdio: 'inherit',
        env: { ...process.env, SEARCH_QUERY: searchQuery } 
    }); 

    console.log("\n▶️ STEP 2: Filtering Leads...");
    execSync('node filter.js', { stdio: 'inherit' });

    console.log("\n▶️ STEP 3: Running Deep Agency Audit...");
    execSync('node auditor.js', { stdio: 'inherit' });

    console.log("\n🧹 STEP 4: Cleaning up temporary files...");
    
    if (fs.existsSync('leads.json')) {
        fs.unlinkSync('leads.json');
        console.log("   -> Deleted raw leads.json");
    }
    
    if (fs.existsSync('needs_redesign.json')) {
        fs.unlinkSync('needs_redesign.json');
        console.log("   -> Deleted temporary needs_redesign.json");
    }

    console.log("\n✅ ALL DONE! Your machine has finished running.");
    console.log("Your final two lead lists are ready for outreach:");
    console.log("   📁 needs_new_website.json");
    console.log("   📁 qualified_leads.json\n");

  } catch (error) {
    console.error("\n❌ An error occurred during the execution pipeline:", error.message);
  }
});