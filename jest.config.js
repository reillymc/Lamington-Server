/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    globalSetup: "./tests/setup.ts",
    globalTeardown: "./tests/teardown.ts",
    testTimeout: 200000,
    watchAll: false,
    collectCoverageFrom: ["./src/**"],
};
