import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables at startup
if (!supabaseUrl) {
  console.error("❌ [Supabase] SUPABASE_URL environment variable is missing!");
  throw new Error("SUPABASE_URL environment variable is required");
}

if (!supabaseServiceKey) {
  console.error("❌ [Supabase] SUPABASE_SERVICE_ROLE_KEY environment variable is missing!");
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

console.log("✅ [Supabase] Initializing client with configured service credentials");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test connection on startup (skipped by isolated unit tests).
if (process.env.SUPABASE_SKIP_CONNECTION_TEST !== "true") (async () => {
  try {
    // Make a simple query to test the connection
    const { error } = await supabase.from("chat_sessions").select("id").limit(1);
    if (error) {
      console.error("❌ [Supabase] Connection test failed:", error.message);
      console.error("   Code:", error.code);
      console.error("   Details:", error.details);
      console.error("   Hint:", error.hint);
    } else {
      console.log("✅ [Supabase] Connection test successful");
    }
  } catch (err: any) {
    console.error("❌ [Supabase] Connection test error:", err.message);
    console.error("   Stack:", err.stack);
  }
})();

export { supabase };
