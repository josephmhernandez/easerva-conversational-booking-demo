// frontend/lib/websocket-client.ts

import type { ClientEvent, ServerEvent } from "@shared/protocol";

export class SecureChatWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectionId: string | null = null;

  private authOpts: { sessionId?: string; lastSeqSeen?: number } | undefined;

  constructor(
    private onMessage: (message: ServerEvent) => void,
    private onError: (error: Event) => void,
    private onClose: () => void,
    private onConnectionEstablished?: (connectionId: string) => void
  ) {}

  async connect(opts?: { sessionId?: string; lastSeqSeen?: number }): Promise<void> {
    this.authOpts = opts;
    const tokenData = await this.getWebSocketToken();
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = async () => {
      const { accessToken } = await this.getSupabaseAuthInfo();
      this.sendAuthMessage(tokenData.token, accessToken, this.authOpts);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as ServerEvent;

        // Check for connection.established to capture connectionId
        if (message.type === "connection.established" && "connectionId" in message) {
          this.connectionId = message.connectionId as string;
          console.log("✅ WebSocket connection established with ID:", this.connectionId);
          this.onConnectionEstablished?.(this.connectionId);
        }

        // Normal path: pass through ServerEvent
        this.onMessage(message as ServerEvent);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onerror = (error) => {
      this.onError(error);
    };

    this.ws.onclose = () => {
      this.connectionId = null;
      this.onClose();
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };
  }

  private sendAuthMessage(
    token: string,
    accessToken?: string,
    opts?: { sessionId?: string; lastSeqSeen?: number }
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: "authenticate",
        token,
        accessToken,
        sessionId: opts?.sessionId,
        lastSeqSeen: opts?.lastSeqSeen ?? 0,
      })
    );
  }

  private async getWebSocketToken(): Promise<{ token: string; expiresIn: number }> {
    try {
      // Check if user is authenticated first
      const { isAuthenticated } = await this.checkAuthenticationStatus();

      // Only set guest ID when user is not authenticated
      let guestId: string | null = null;
      if (!isAuthenticated) {
        try {
          guestId = typeof window !== "undefined" ? sessionStorage.getItem("guest_id") : null;
          if (!guestId && typeof window !== "undefined") {
            // Prefer crypto.randomUUID if available
            const newId =
              window.crypto && "randomUUID" in window.crypto
                ? (window.crypto as Crypto & { randomUUID: () => string }).randomUUID()
                : `guest_${Math.random().toString(36).slice(2)}_${Date.now()}`;
            sessionStorage.setItem("guest_id", newId);
            guestId = newId;
            console.log("🆔 Created guest ID for unauthenticated user:", newId);
          }
        } catch {}
      } else {
        console.log("👤 User is authenticated, skipping guest ID creation");
      }

      const response = await fetch("/api/auth/websocket-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get WebSocket token: ${errorData.error || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get WebSocket token:", error);
      throw new Error("Failed to authenticate WebSocket connection");
    }
  }

  private async getSupabaseAuthInfo(): Promise<{ accessToken?: string }> {
    try {
      const { createClient: createSupabaseBrowser } = await import("@/app/utils/supabase/client");
      const supabase = createSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token || undefined;
      return { accessToken };
    } catch {
      return {};
    }
  }

  private async checkAuthenticationStatus(): Promise<{ isAuthenticated: boolean }> {
    try {
      const { createClient: createSupabaseBrowser } = await import("@/app/utils/supabase/client");
      const supabase = createSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      const isAuthenticated = !!sessionData.session?.user;
      return { isAuthenticated };
    } catch {
      return { isAuthenticated: false };
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(
      `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }

  sendMessage(message: ClientEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.connectionId) {
      throw new Error("WebSocket not ready");
    }
    const envelope = { ...message, connectionId: this.connectionId };
    this.ws.send(JSON.stringify(envelope));
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts;

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.connectionId = null;
  }

  /**
   * Force a reconnection with fresh authentication
   * This is useful when the user's authentication state changes
   */
  async forceReconnect(): Promise<void> {
    console.log("🔄 Force reconnecting WebSocket...");

    // Disconnect current connection
    if (this.ws) {
      this.ws.close(1000, "Force reconnect");
      this.ws = null;
    }
    this.connectionId = null;

    // Reset reconnect attempts for clean retry
    this.reconnectAttempts = 0;

    // Connect with fresh authentication
    await this.connect();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.connectionId !== null;
  }
}
