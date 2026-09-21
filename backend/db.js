import mongoose from "mongoose";

let connPromise = null;

// Cached connection so Vercel functions (and repeated local imports) reuse the
// same Mongo connection instead of reconnecting on every cold start.
export default async function connectDB() {
  if (!connPromise) {
    connPromise = doConnect();
  }
  try {
    await connPromise;
  } catch (error) {
    connPromise = null;
    throw error;
  }
  return mongoose.connection;
}

async function doConnect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Fail fast with a clear message instead of letting every query buffer for
    // 10s and then throw "buffering timed out after 10000ms".
    mongoose.set("bufferCommands", false);
    throw new Error(
      "[db] MONGODB_URI is not set. Add it to the Vercel project (Settings > Environment Variables) and redeploy.",
    );
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
  return mongoose.connection;
}