"use client";

import dynamic from "next/dynamic";

// Dynamically import ChatApp with SSR disabled to prevent server-side rendering issues
const ChatApp = dynamic(
  () => import("../../components/ui/ChatApp").then((mod) => ({ default: mod.ChatApp })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50" />
    ),
  }
);

interface ChatAppClientProps {
  initialSession: unknown | null;
  initialMessages: unknown[];
}

export default function ChatAppClient({ initialSession, initialMessages }: ChatAppClientProps) {
  return <ChatApp initialSession={initialSession} initialMessages={initialMessages} />;
}
