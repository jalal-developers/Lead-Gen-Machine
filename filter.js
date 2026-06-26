const fs = require('fs');

// Load your raw leads
const rawData = fs.readFileSync('leads.json');
const leads = JSON.parse(rawData);

// Create the two buckets
const needsRedesign = [];
const needsNewWebsite = [];

// Sort them based on their current web presence
leads.forEach(lead => {
  if (lead.Website === "No Website") {
    needsNewWebsite.push(lead);
  } else {
    needsRedesign.push(lead);
  }
});

// Save the clean lists
fs.writeFileSync('needs_redesign.json', JSON.stringify(needsRedesign, null, 2));
fs.writeFileSync('needs_new_website.json', JSON.stringify(needsNewWebsite, null, 2));

console.log(`\n✅ Filtered! You have ${needsRedesign.length} Redesign targets and ${needsNewWebsite.length} New Build targets.\n`);