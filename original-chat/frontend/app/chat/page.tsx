import { Suspense } from "react";
import { createClient } from "../utils/supabase/server";
import ChatAppClient from "./ChatAppClient";

export default async function ChatPage() {
  // Gate on server
  const supabase = await createClient();
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();

  let initialData: { session: unknown | null; messages: unknown[] } = {
    session: null,
    messages: [],
  };

  if (authSession) {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      const url = `${backendUrl}/api/chat/session`;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${authSession.access_token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          initialData = { session: data.session ?? null, messages: data.messages ?? [] };
        }
      } catch {}
    }
  }

  return (
    <Suspense
      fallback={<div className="h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50" />}
    >
      <ChatAppClient initialSession={initialData.session} initialMessages={initialData.messages} />
    </Suspense>
  );
}
