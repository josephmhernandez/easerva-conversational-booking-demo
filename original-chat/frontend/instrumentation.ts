// This file runs in both Node.js and Edge runtime
// Logger is initialized directly in API routes (Node.js runtime only)
// No need to initialize here since instrumentation runs in both runtimes

export async function register() {
  // Logger is initialized in API routes directly
  // This avoids Edge runtime compatibility issues
}
