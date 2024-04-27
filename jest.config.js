/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    globalSetup: "./tests/setup.ts",
    globalTeardown: "./tests/teardown.ts",
    testTimeout: 20000,
    watchAll: false,
    collectCoverageFrom: ["./src/**"],
    coveragePathIgnorePatterns: ["/src/docs/", "/src/database/migrations/", "/src/database/seeds/"],
    setupFilesAfterEnv: ["./tests/setupTests.ts"],
};
