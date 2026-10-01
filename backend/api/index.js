import app from "../src/index.js";

// Export standard Vercel serverless function handler
export const handler = (req, res) => {
  return app(req, res);
};

// Also export Express app as default for automatic @vercel/node handling
export default app;
