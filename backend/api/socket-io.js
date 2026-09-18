import "dotenv/config";
import connectDB from "../db.js";
import { server } from "../server.js";

await connectDB();

// Vercel Function serving Socket.IO. Served at /api/socket-io, so the Socket.IO
// path becomes /api/socket-io/socket.io (set SOCKETIO_PATH accordingly, and the
// client must use transports: ["websocket"] and that same path).
export default server;