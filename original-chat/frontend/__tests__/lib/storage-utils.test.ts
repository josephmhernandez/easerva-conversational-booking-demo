/**
 * Storage Utils Unit Tests
 *
 * Tests for session storage utility functions used throughout the app.
 * Written by Chives 🌿 as an integration verification test.
 */

import {
  clearAllSessionStorage,
  clearChatStorage,
  clearTemporaryChatSessionKeys,
  clearGuestKeysIfAuthenticated,
  hasTemporaryGuestKeys,
  setGuestKeyIfUnauthenticated,
  STORAGE_KEYS,
} from "@/lib/storage-utils";

// sessionStorage is mocked via jest.setup.js
beforeEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
});

describe("STORAGE_KEYS", () => {
  it("defines all expected keys", () => {
    expect(STORAGE_KEYS.SESSION).toBe("chat_session");
    expect(STORAGE_KEYS.MESSAGES).toBe("chat_messages");
    expect(STORAGE_KEYS.LAST_SYNC).toBe("chat_last_sync");
    expect(STORAGE_KEYS.GUEST_ID).toBe("guest_id");
    expect(STORAGE_KEYS.PENDING_LINK_SESSION_ID).toBe("pending_link_session_id");
    expect(STORAGE_KEYS.INITIAL_MESSAGE).toBe("initial_message");
  });
});

describe("clearAllSessionStorage", () => {
  it("removes all known storage keys", () => {
    Object.values(STORAGE_KEYS).forEach((key) => {
      sessionStorage.setItem(key, "test-value");
    });

    clearAllSessionStorage();

    Object.values(STORAGE_KEYS).forEach((key) => {
      expect(sessionStorage.getItem(key)).toBeNull();
    });
  });

  it("does not throw when storage is already empty", () => {
    expect(() => clearAllSessionStorage()).not.toThrow();
  });
});

describe("clearChatStorage", () => {
  it("removes only chat-related keys", () => {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, "session-data");
    sessionStorage.setItem(STORAGE_KEYS.MESSAGES, "messages-data");
    sessionStorage.setItem(STORAGE_KEYS.LAST_SYNC, "sync-data");
    sessionStorage.setItem(STORAGE_KEYS.GUEST_ID, "guest-123");

    clearChatStorage();

    expect(sessionStorage.getItem(STORAGE_KEYS.SESSION)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.MESSAGES)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.LAST_SYNC)).toBeNull();
    // Non-chat key should remain untouched
    expect(sessionStorage.getItem(STORAGE_KEYS.GUEST_ID)).toBe("guest-123");
  });
});

describe("clearTemporaryChatSessionKeys", () => {
  it("removes guest id and pending link session id", () => {
    sessionStorage.setItem(STORAGE_KEYS.GUEST_ID, "guest-abc");
    sessionStorage.setItem(STORAGE_KEYS.PENDING_LINK_SESSION_ID, "pending-xyz");

    clearTemporaryChatSessionKeys();

    expect(sessionStorage.getItem(STORAGE_KEYS.GUEST_ID)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.PENDING_LINK_SESSION_ID)).toBeNull();
  });

  it("leaves other keys intact", () => {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, "keep-me");
    sessionStorage.setItem(STORAGE_KEYS.GUEST_ID, "guest-abc");

    clearTemporaryChatSessionKeys();

    expect(sessionStorage.getItem(STORAGE_KEYS.SESSION)).toBe("keep-me");
  });
});

describe("hasTemporaryGuestKeys", () => {
  it("returns false when no guest keys are set", () => {
    expect(hasTemporaryGuestKeys()).toBe(false);
  });

  it("returns true when guest id is present", () => {
    sessionStorage.setItem(STORAGE_KEYS.GUEST_ID, "guest-123");
    expect(hasTemporaryGuestKeys()).toBe(true);
  });

  it("returns true when pending link session id is present", () => {
    sessionStorage.setItem(STORAGE_KEYS.PENDING_LINK_SESSION_ID, "pending-456");
    expect(hasTemporaryGuestKeys()).toBe(true);
  });

  it("returns true when both keys are present", () => {
    sessionStorage.setItem(STORAGE_KEYS.GUEST_ID, "guest-123");
    sessionStorage.setItem(STORAGE_KEYS.PENDING_LINK_SESSION_ID, "pending-456");
    expect(hasTemporaryGuestKeys()).toBe(true);
  });
});

describe("setGuestKeyIfUnauthenticated", () => {
  it("sets the key when no auth check is provided", async () => {
    const result = await setGuestKeyIfUnauthenticated("GUEST_ID", "new-guest-id");

    expect(result).toBe(true);
    expect(sessionStorage.getItem(STORAGE_KEYS.GUEST_ID)).toBe("new-guest-id");
  });

  it("sets the key when auth check returns false (unauthenticated)", async () => {
    const checkAuth = jest.fn().mockResolvedValue(false);

    const result = await setGuestKeyIfUnauthenticated("GUEST_ID", "guest-xyz", checkAuth);

    expect(result).toBe(true);
    expect(sessionStorage.getItem(STORAGE_KEYS.GUEST_ID)).toBe("guest-xyz");
    expect(checkAuth).toHaveBeenCalledTimes(1);
  });

  it("does not set the key when auth check returns true (authenticated)", async () => {
    const checkAuth = jest.fn().mockResolvedValue(true);

    const result = await setGuestKeyIfUnauthenticated("GUEST_ID", "should-not-set", checkAuth);

    expect(result).toBe(false);
    expect(sessionStorage.getItem(STORAGE_KEYS.GUEST_ID)).toBeNull();
  });
});

describe("clearGuestKeysIfAuthenticated", () => {
  it("clears guest keys when user is authenticated", async () => {
    sessionStorage.setItem(STORAGE_KEYS.GUEST_ID, "guest-123");
    sessionStorage.setItem(STORAGE_KEYS.PENDING_LINK_SESSION_ID, "pending-456");

    const checkAuth = jest.fn().mockResolvedValue(true);
    await clearGuestKeysIfAuthenticated(checkAuth);

    expect(sessionStorage.getItem(STORAGE_KEYS.GUEST_ID)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.PENDING_LINK_SESSION_ID)).toBeNull();
  });

  it("does not clear guest keys when user is not authenticated", async () => {
    sessionStorage.setItem(STORAGE_KEYS.GUEST_ID, "guest-123");

    const checkAuth = jest.fn().mockResolvedValue(false);
    await clearGuestKeysIfAuthenticated(checkAuth);

    expect(sessionStorage.getItem(STORAGE_KEYS.GUEST_ID)).toBe("guest-123");
  });

  it("does nothing when no guest keys exist (even if authenticated)", async () => {
    const checkAuth = jest.fn().mockResolvedValue(true);

    await expect(clearGuestKeysIfAuthenticated(checkAuth)).resolves.not.toThrow();
  });
});
