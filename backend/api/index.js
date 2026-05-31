// Vercel serverless entry point
// Loads environment variables and exports the Express app as a serverless function
require("dotenv").config({ override: true });

const app = require("../src/app");

module.exports = app;
