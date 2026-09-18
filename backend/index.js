import "dotenv/config";
import connectDB from "./db.js";
import { app } from "./server.js";

try {
  await connectDB();
} catch (error) {
  // Log clearly instead of blocking module load — otherwise every request
  // returns FUNCTION_INVOCATION_FAILED with no visible reason. With this,
  // a bad MONGODB_URI shows a normal 500 + this console message in logs.
  console.error("[startup] MongoDB connection failed:", error.message);
}

// Vercel Function serving the full Express REST app (root routes, e.g. /api/*).
export default app;