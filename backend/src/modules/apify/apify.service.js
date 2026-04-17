import { ApifyClient } from "apify-client";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const isMockMode = !APIFY_TOKEN;

// Initialize the ApifyClient silently if there's no token so it doesn't crash
const client = new ApifyClient({
    token: APIFY_TOKEN || "mock-token",
});

/**
 * Runs an Apify actor and retrieves the dataset items.
 * If APIFY_API_TOKEN is missing or running in mock mode,
 * creates and returns a dummy dataset simulating news/social signals.
 */
export const runActorAndFetchDataset = async (actorId, inputConfig = {}) => {
    console.log(`[APIFY SERVICE] Running actor ${actorId} in ${isMockMode ? "MOCK" : "LIVE"} mode.`);

    if (isMockMode) {
        // MOCK MODE
        // Simulate a 3-second scraper delay
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Generate 3 random narrative signals
        const mockDataset = [
            {
                url: "https://mocknews.com/tech-announcement",
                title: "Major Tech Announcement Expected Tomorrow",
                text: "Industry leaders are anticipating a groundbreaking release tomorrow that could change the AI landscape. Stakeholders are heavily invested.",
                author: "Tech Insider",
                publishedDate: new Date().toISOString()
            },
            {
                url: "https://mocksocial.com/post/98234",
                title: "User Complaint Regarding Downtime",
                text: "The service has been down for 2 hours! Unacceptable customer experience. They need to fix this immediately.",
                author: "angry_user99",
                publishedDate: new Date().toISOString()
            },
            {
                url: "https://mockforum.com/discussion/1",
                title: "Discussion on new Policy Regulations",
                text: "The new data privacy policies look strict but necessary. Will this impact the smaller vendors significantly?",
                author: "PolicyWonk",
                publishedDate: new Date().toISOString()
            }
        ];

        return mockDataset;
    }

    // LIVE MODE
    try {
        // Run the Actor and wait for it to finish
        const run = await client.actor(actorId).call(inputConfig);
        
        // Fetch and return actor results from the run's dataset (if any)
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items;
    } catch (error) {
        console.error("[APIFY SERVICE] Error in Live Mode:", error);
        throw new Error("Apify live extraction failed");
    }
};
