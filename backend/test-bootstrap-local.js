import 'dotenv/config';
import { bootstrapDefaultSources } from './src/modules/sources/sources.controller.js';

const req = {
  user: { id: '00000000-0000-4000-8000-000000000001' },
  body: {
    keyword: "GoTo",
    includeActors: true,
    includeWebScrapers: true,
    tiers: [1, 2],
    maxWebItems: 20
  }
};

const res = {
  status: (s) => ({
    json: (data) => console.log(s, data)
  }),
  json: (data) => console.log(200, data)
};

try {
  await bootstrapDefaultSources(req, res);
} catch (e) {
  console.error("Uncaught exception:", e);
}