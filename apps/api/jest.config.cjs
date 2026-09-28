module.exports = {
  testEnvironment: "node",

  testMatch: ["<rootDir>/tests/**/*.test.ts"],

  transform: {
    "^.+\\.ts$": "babel-jest",
  },

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  clearMocks: true,
};
