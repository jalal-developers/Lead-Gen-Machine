const fs = require('fs');

// 1. Wrap your sorting logic inside a function
function filterLeads(leads) {
  const needsRedesign = [];
  const needsNewWebsite = [];

  leads.forEach(lead => {
    if (lead.Website === "No Website") {
      needsNewWebsite.push(lead);
    } else {
      needsRedesign.push(lead);
    }
  });

  return { needsRedesign, needsNewWebsite };
}

// 2. Only run the file-reading stuff if this script is executed directly by run.js
if (require.main === module) {
  const rawData = fs.readFileSync('leads.json');
  const leads = JSON.parse(rawData);
  
  const { needsRedesign, needsNewWebsite } = filterLeads(leads);

  fs.writeFileSync('needs_redesign.json', JSON.stringify(needsRedesign, null, 2));
  fs.writeFileSync('needs_new_website.json', JSON.stringify(needsNewWebsite, null, 2));

  console.log(`\n✅ Filtered! You have ${needsRedesign.length} Redesign targets and ${needsNewWebsite.length} New Build targets.\n`);
}

// 3. Export the function so Jest can read it!
module.exports = { filterLeads };