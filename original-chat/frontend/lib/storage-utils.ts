// Storage utility functions for managing session storage
export const STORAGE_KEYS = {
  // Chat-related storage
  SESSION: "chat_session",
  MESSAGES: "chat_messages",
  LAST_SYNC: "chat_last_sync",

  // Authentication-related storage
  GUEST_ID: "guest_id",
  PENDING_LINK_SESSION_ID: "pending_link_session_id",

  // Landing page bridge storage
  INITIAL_MESSAGE: "initial_message",
} as const;

/**
 * Clears all session storage data used by the application
 */
export const clearAllSessionStorage = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    // Handle case where sessionStorage is not available (SSR, incognito mode, etc.)
    console.warn("Failed to clear session storage:", error);
  }
};

/**
 * Clears only chat-related session storage
 */
export const clearChatStorage = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.MESSAGES);
    sessionStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
  } catch (error) {
    console.warn("Failed to clear chat storage:", error);
  }
};

/**
 * Clears temporary session keys that are no longer needed after successful session linking
 * This should be called after a successful session link POST request acknowledgement
 */
export const clearTemporaryChatSessionKeys = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.GUEST_ID);
    sessionStorage.removeItem(STORAGE_KEYS.PENDING_LINK_SESSION_ID);
    console.log("✅ Cleared temporary chat session keys after successful session link");
  } catch (error) {
    console.warn("Failed to clear temporary chat session keys:", error);
  }
};

/**
 * Checks if there are any temporary guest keys in session storage
 * This indicates a guest session that may need linking
 */
export const hasTemporaryGuestKeys = (): boolean => {
  try {
    const guestId = sessionStorage.getItem(STORAGE_KEYS.GUEST_ID);
    const pendingSessionId = sessionStorage.getItem(STORAGE_KEYS.PENDING_LINK_SESSION_ID);
    return !!(guestId || pendingSessionId);
  } catch {
    return false;
  }
};

/**
 * Safely sets a guest-related key only if no user is currently authenticated
 * This prevents guest keys from being set when a user is already logged in
 */
export const setGuestKeyIfUnauthenticated = async (
  key: keyof typeof STORAGE_KEYS,
  value: string,
  checkAuthCallback?: () => Promise<boolean>
): Promise<boolean> => {
  try {
    // If a custom auth check is provided, use it
    if (checkAuthCallback) {
      const isAuthenticated = await checkAuthCallback();
      if (isAuthenticated) {
        console.log(`🚫 User is authenticated, not setting ${key}`);
        return false;
      }
    }

    sessionStorage.setItem(STORAGE_KEYS[key], value);
    console.log(`✅ Set ${key} for unauthenticated user`);
    return true;
  } catch (error) {
    console.warn(`Failed to set ${key}:`, error);
    return false;
  }
};

/**
 * Clears guest keys if a user becomes authenticated
 * This ensures authenticated users don't have stale guest data
 */
export const clearGuestKeysIfAuthenticated = async (
  checkAuthCallback: () => Promise<boolean>
): Promise<void> => {
  try {
    const isAuthenticated = await checkAuthCallback();
    if (isAuthenticated && hasTemporaryGuestKeys()) {
      console.log("🧹 User is authenticated, clearing stale guest keys");
      clearTemporaryChatSessionKeys();
    }
  } catch (error) {
    console.warn("Failed to clear guest keys for authenticated user:", error);
  }
};
