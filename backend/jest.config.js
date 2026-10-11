export default {
  transform: {},
  testEnvironment: 'node',
  clearMocks: true,
  // Legacy Prisma-mocked suites cannot load against the Supabase code base;
  // see tests/legacy/README.md for what was ported and what is not covered.
  testPathIgnorePatterns: ['/node_modules/', '/tests/legacy/'],
};
