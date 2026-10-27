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

// Log configuration (without exposing secrets)
console.log("✅ [Supabase] Initializing client");
console.log(`   URL: ${supabaseUrl}`);
console.log(
  `   Service Key: ${supabaseServiceKey.substring(0, 10)}...${supabaseServiceKey.substring(supabaseServiceKey.length - 4)}`
);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test connection on startup
(async () => {
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
