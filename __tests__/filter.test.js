const { filterLeads } = require('../filter');

test('should correctly separate leads with and without websites', () => {
  // 1. Create fake test data
  const mockLeads = [
    { Company: "Lahore Plumbers", Website: "No Website" },
    { Company: "Tech Solutions", Website: "https://techsolutions.com" },
    { Company: "Gulberg Gym", Website: "No Website" }
  ];

  // 2. Run your function
  const result = filterLeads(mockLeads);

  // 3. Assert that the function did its job correctly
  expect(result.needsNewWebsite.length).toBe(2); // Lahore Plumbers & Gulberg Gym
  expect(result.needsRedesign.length).toBe(1);   // Tech Solutions
  
  // Make sure it put the right company in the right bucket
  expect(result.needsRedesign[0].Company).toBe("Tech Solutions");
});