// Load environment variables FIRST, before any other imports
import dotenv from "dotenv";
dotenv.config();

// Initialize logger to capture all console output to app.log
import "./logger";

// Validate critical environment variables
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error("Please ensure all required environment variables are set in Railway.");
  process.exit(1);
}

console.log("✅ All required environment variables are present");

import cors from "cors";
import express from "express";
import { WebSocketServer } from "ws";
import chatRoutes from "./routes/chat"; // Add this import
import { authenticateWebSocket, handleWebSocketConnection } from "./websocket/handler";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOptions = {
  origin: [
    "http://localhost:3000", // For development
    "https://chat-app-production-f8ea.up.railway.app", // Your deployed frontend
    "https://www.easerva.com",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

if (process.env.FRONTEND_URL) {
  corsOptions.origin?.push(process.env.FRONTEND_URL);
}

if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  corsOptions.origin?.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Backend server is running!",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Routes
app.use("/api/chat", chatRoutes);

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment loaded: ${process.env.NODE_ENV || "development"}`);
});

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: "/ws",
});

// Handle WebSocket connections
wss.on("connection", (ws, request) => {
  const authenticatedWs = authenticateWebSocket(ws, request);

  if (!authenticatedWs) {
    ws.close(1008, "Authentication failed");
    return;
  }

  handleWebSocketConnection(authenticatedWs);
});

console.log("WebSocket server initialized on /ws");
