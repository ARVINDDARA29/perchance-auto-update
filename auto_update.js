const fetch = require("node-fetch");

async function run() {
  const perchanceURL = "https://perchance.org/YOUR_GENERATOR_NAME";

  console.log("Checking generator:", perchanceURL);

  // Example: Update logic
  // (यहाँ आप fetch/post/edit वाला code डालेंगे जो comment line जोड़ता है)
  // फिलहाल बस एक log दिखाते हैं:
  console.log("✅ Auto-update simulated at", new Date().toISOString());
}

run().catch(console.error);
