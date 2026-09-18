import "dotenv/config";
import connectDB from "./db.js";
import { app } from "./server.js";

await connectDB();

// Vercel Function serving the full Express REST app (root routes, e.g. /api/*).
export default app;