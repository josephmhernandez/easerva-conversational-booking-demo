import dotenv from "dotenv";
import jwt from "jsonwebtoken";

if (!process.env.JWT_WEBSOCKET_SECRET) {
  dotenv.config();
}

export interface WebSocketTokenPayload {
  userId: string;
  email?: string;
  type: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_WEBSOCKET_SECRET;
const JWT_EXPIRES_IN = "5m"; // ✅ Reduced to 5 minutes

if (!JWT_SECRET) {
  throw new Error("JWT_WEBSOCKET_SECRET environment variable is required");
}

export const generateWebSocketToken = (
  userId: string,
  email: string,
  sessionId?: string
): string => {
  return jwt.sign(
    {
      userId,
      email,
      sessionId,
      type: "websocket", // ✅ Added type verification
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const verifyWebSocketToken = (token: string): WebSocketTokenPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as WebSocketTokenPayload;

    // ✅ Verify token type
    if (payload.type !== "websocket") {
      throw new Error("Invalid token type");
    }

    return payload;
  } catch (error) {
    throw new Error("Invalid or expired WebSocket token");
  }
};
