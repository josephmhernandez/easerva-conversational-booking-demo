import fs from "fs";
import path from "path";

// Only enable file logging in development
const ENABLE_FILE_LOGGING = process.env.NODE_ENV === "development";

// Determine project root (go up one level from backend directory)
const PROJECT_ROOT = process.cwd().endsWith("backend")
  ? path.join(process.cwd(), "..")
  : process.cwd();
const LOG_FILE = path.join(PROJECT_ROOT, "app.log");

// Ensure log file exists only in development
if (ENABLE_FILE_LOGGING && !fs.existsSync(LOG_FILE)) {
  try {
    fs.writeFileSync(LOG_FILE, "");
  } catch {
    // Silently fail if we can't create log file
  }
}

// Helper function to write to log file
function writeToLog(level: string, ...args: unknown[]): void {
  // Skip file logging in production
  if (!ENABLE_FILE_LOGGING) {
    return;
  }

  try {
    const timestamp = new Date().toISOString();
    const message = args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");

    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry, "utf8");
  } catch (error) {
    // Silently fail if we can't write to log file
    // Don't want to create infinite loops
  }
}

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
};

// Override console methods
console.log = (...args: unknown[]) => {
  writeToLog("LOG", ...args);
  originalConsole.log(...args);
};

console.error = (...args: unknown[]) => {
  writeToLog("ERROR", ...args);
  originalConsole.error(...args);
};

console.warn = (...args: unknown[]) => {
  writeToLog("WARN", ...args);
  originalConsole.warn(...args);
};

console.info = (...args: unknown[]) => {
  writeToLog("INFO", ...args);
  originalConsole.info(...args);
};

console.debug = (...args: unknown[]) => {
  writeToLog("DEBUG", ...args);
  originalConsole.debug(...args);
};

export default {};
