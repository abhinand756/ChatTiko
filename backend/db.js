import mongoose from "mongoose";

let connPromise = null;

// Cached connection so Vercel functions (and repeated local imports) reuse the
// same Mongo connection instead of reconnecting on every cold start.
export default async function connectDB() {
  if (!connPromise) {
    connPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }
  try {
    await connPromise;
  } catch (error) {
    connPromise = null;
    throw error;
  }
  return mongoose.connection;
}