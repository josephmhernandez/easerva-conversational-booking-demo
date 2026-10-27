// backend/src/auth/middleware.ts
import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

// Initialize Supabase admin client (using service role key)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No authorization token provided" });
      return; // Important: return void, don't return the response
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.error("Token verification failed:", error);
      res.status(401).json({ error: "Invalid or expired token" });
      return; // Important: return void, don't return the response
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      email: user.email!,
      role: user.role,
      ...user.user_metadata,
    };

    console.log(`Authenticated user: ${user.email} (${user.id})`);
    next(); // Continue to next middleware/route handler
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(401).json({ error: "Authentication failed" });
    return; // Important: return void, don't return the response
  }
}
