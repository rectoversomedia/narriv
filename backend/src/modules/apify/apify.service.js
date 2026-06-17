import { ApifyClient } from "apify-client";
import { logStructured } from "../../lib/logger.js";

const APIFY_TOKEN = process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN;
const isMockMode = !APIFY_TOKEN;

// Initialize the ApifyClient silently if there's no token so it doesn't crash
const client = new ApifyClient({
    token: APIFY_TOKEN || "mock-token",
});

/**
 * Runs an Apify actor and retrieves the dataset items.
 * If APIFY_TOKEN is missing or running in mock mode,
 * creates and returns a dummy dataset simulating news/social signals.
 */
export const runActorAndFetchDataset = async (actorId, inputConfig = {}) => {
    logStructured("info", "apify_actor_running", { actorId, mode: isMockMode ? "MOCK" : "LIVE" });

    if (isMockMode) {
        // MOCK MODE
        // Simulate a 3-second scraper delay
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const sourceType = inputConfig.sourceType || "web";
        let mockDataset = [];

        if (sourceType === "news") {
            mockDataset = [
                {
                    url: "https://mocknews.com/tech-announcement",
                    title: "Major Tech Announcement Expected Tomorrow",
                    text: "Industry leaders are anticipating a groundbreaking release tomorrow that could change the AI landscape. Stakeholders are heavily invested.",
                    author: "Tech Insider",
                    publishedDate: new Date().toISOString()
                },
                {
                    url: "https://mocknews.com/market-update",
                    title: "Markets Rally After Tech Earnings",
                    text: "Global markets saw significant gains today as major tech companies reported better-than-expected quarterly earnings.",
                    author: "Financial Times",
                    publishedDate: new Date().toISOString()
                }
            ];
        } else if (sourceType === "social") {
            mockDataset = [
                {
                    url: "https://mocksocial.com/post/98234",
                    title: "User Complaint Regarding Downtime",
                    text: "The service has been down for 2 hours! Unacceptable customer experience. They need to fix this immediately.",
                    author: "angry_user99",
                    publishedDate: new Date().toISOString()
                },
                {
                    url: "https://mocksocial.com/post/98235",
                    title: "Loving the new update!",
                    text: "Just tried the new features and I'm blown away. The UI is so much smoother now. Great job team!",
                    author: "happy_customer",
                    publishedDate: new Date().toISOString()
                }
            ];
        } else if (sourceType === "forum") {
            mockDataset = [
                {
                    url: "https://mockforum.com/discussion/1",
                    title: "Discussion on new Policy Regulations",
                    text: "The new data privacy policies look strict but necessary. Will this impact the smaller vendors significantly?",
                    author: "PolicyWonk",
                    publishedDate: new Date().toISOString()
                },
                {
                    url: "https://mockforum.com/discussion/2",
                    title: "Help with API integration",
                    text: "I'm trying to connect the new REST API but keep getting a 401 error. Anyone else experienced this? Here's my config...",
                    author: "dev_newbie",
                    publishedDate: new Date().toISOString()
                }
            ];
        } else {
            // Mixed fallback
            mockDataset = [
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
                }
            ];
        }

        // Add the input query to make the mock data look more realistic if a query exists
        const query = inputConfig.queries ? inputConfig.queries.split(' ')[0] : '';
        if (query && query !== 'undefined') {
            mockDataset = mockDataset.map(item => ({
                ...item,
                title: `[${query}] ${item.title}`
            }));
        }

        return mockDataset;
    }

    // LIVE MODE
    try {
        logStructured("info", "apify_actor_calling", { actorId });
        // Run the Actor and wait for it to finish
        const run = await client.actor(actorId).call(inputConfig);
        logStructured("info", "apify_run_completed", { datasetId: run.defaultDatasetId });
        
        // Fetch and return actor results from the run's dataset (if any)
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        logStructured("info", "apify_items_fetched", { itemCount: items.length });
        return items;
    } catch (error) {
        logStructured("error", "[APIFY SERVICE] Error in Live Mode", { error: error?.message || error, stack: error?.stack });
        throw new Error(`Apify live extraction failed: ${error.message}`);
    }
};
