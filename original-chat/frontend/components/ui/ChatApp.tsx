// frontend/components/ui/ChatApp.tsx
"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ArrowLeft, Clock, Plus, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Card, ClientEvent, Company, TimeSlot } from "../../../shared/protocol";
import { ChatSession, UIMessage, useWebSocketChat } from "../../app/hooks/useWebSocketChat";
import { webSocketSingleton } from "../../lib/websocket-singleton";
import AppointmentScheduler from "./AppointmentScheduler";
import { Button } from "./button";
import { CardSelection } from "./CardSelection";
import { CompanySelection } from "./CompanySelection";
import { Input } from "./input";
import { SignOutButton } from "./SignOutButton";

interface ChatAppProps {
  initialSession: unknown | null;
  initialMessages: unknown[];
}

export function ChatApp({ initialSession, initialMessages }: ChatAppProps) {
  const router = useRouter();

  // Check if we just completed OAuth and clean up URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("oauth_complete") === "true") {
        console.log("🔄 OAuth completed, cleaning up URL");
        // Remove the parameter from URL
        urlParams.delete("oauth_complete");
        const newUrl =
          window.location.pathname + (urlParams.toString() ? "?" + urlParams.toString() : "");
        window.history.replaceState({}, "", newUrl);

        // The useWebSocketChat hook will handle the session linking automatically
        // No need to reload the page anymore
      }
    }
  }, []);

  // Cast and normalize initial data
  const seededSession = (initialSession as ChatSession) ?? null;
  const seededMessages =
    (
      initialMessages as Array<Omit<UIMessage, "timestamp"> & { timestamp: string }> | undefined
    )?.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })) ?? [];

  const {
    messages,
    cards,
    companies,
    timeSlots,
    session,
    isConnected,
    isConnecting,
    isLoading,
    isBusy,
    error,
    showUserPromptImAuthenticated,
    sendMessage,
    startNewChat,
    retryConnection,

    user,
  } = useWebSocketChat({ initialSession: seededSession, initialMessages: seededMessages });

  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Read and forward initial message from sessionStorage (bridge from landing)
  useEffect(() => {
    try {
      // if (isConnected && !isConnecting && client?.isConnected()) {
      if (session?.id) {
        const bridged = sessionStorage.getItem("initial_message");
        if (bridged && bridged.trim()) {
          // Send in two seconds so the user has a chance to see the message.
          setTimeout(() => {
            sendMessage(bridged);
            sessionStorage.removeItem("initial_message");
          }, 1000);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll when companies are updated
  useEffect(() => {
    if (companies.length > 0) {
      // Small delay to ensure the company selection component has rendered
      setTimeout(scrollToBottom, 100);
    }
  }, [companies]);

  // Auto-scroll when time slots are updated
  useEffect(() => {
    if (timeSlots.length > 0) {
      // Small delay to ensure the appointment scheduler component has rendered
      setTimeout(scrollToBottom, 100);
    }
  }, [timeSlots]);

  const handleChatMessage = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput);
    setChatInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleChatMessage();
  };

  const handleCompanySelect = (company: Company) => {
    if (webSocketSingleton.isConnected()) {
      const companyMessage: ClientEvent = {
        type: "company.selected",
        company: company,
        ts: new Date().toISOString(),
        sessionId: session!.id,
      };

      webSocketSingleton.sendMessage(companyMessage);
    }
  };

  const handleRequestMoreCompanies = () => sendMessage("Can you show me more companies?");

  const handleCardSelect = (card: Card) => {
    if (webSocketSingleton.isConnected()) {
      const cardMessage: ClientEvent = {
        type: "card.selected",
        card: card,
        ts: new Date().toISOString(),
        sessionId: session!.id,
      };

      webSocketSingleton.sendMessage(cardMessage);
    }
  };

  const goBack = () => router.push("/");

  if (isLoading) {
    return <LoadingSpinner text="Loading chat session..." />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex flex-col animate-in fade-in duration-500">
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm animate-in slide-in-from-top duration-500">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="p-2" onClick={goBack}>
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Easerva</h1>
              <div className="text-xs text-green-500 flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-1 ${
                    isConnected
                      ? "bg-green-400 animate-pulse"
                      : isConnecting
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-red-400"
                  }`}
                ></div>
                {isConnecting ? "Connecting..." : isConnected ? "Online now" : "Offline"}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-500">
            <Clock className="w-4 h-4 inline mr-1" />
            Usually replies instantly
          </div>
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={startNewChat}
              className="text-xs bg-white border-gray-200 hover:bg-gray-50"
            >
              New Chat
            </Button>
          )}

          {user ? (
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-700">Welcome, {user.email}</div>
              <SignOutButton />
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push("/login?next=/chat")}
              className="text-xs"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div
          className={`border-l-4 p-4 mx-4 mt-4 rounded-lg animate-in fade-in slide-in-from-top duration-300 ${
            error.includes("message queued") ||
            error.includes("Not connected") ||
            error.includes("WebSocket not ready")
              ? "bg-yellow-50 border-yellow-400"
              : "bg-red-50 border-red-400"
          }`}
        >
          <p
            className={`text-sm ${error.includes("message queued") || error.includes("Not connected") || error.includes("WebSocket not ready") ? "text-yellow-700" : "text-red-700"}`}
          >
            {error}
          </p>

          {error.includes("Backend unavailable") && (
            <div className="mt-3">
              <Button
                onClick={retryConnection}
                disabled={isLoading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm mr-2"
                size="sm"
              >
                {isLoading ? "Retrying..." : "Retry Connection"}
              </Button>
              <span className="text-xs text-gray-600">Backend server appears to be offline</span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 animate-in fade-in slide-in-from-bottom duration-700 delay-200">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <p className="text-lg font-medium mb-2">Welcome to Easerva! 🏡</p>
            <p className="text-sm">{`I'm here to help you find and book the perfect home viewing.`}</p>
            <p className="text-sm mt-2">{`Start by telling me what you're looking for!`}</p>
          </div>
        ) : (
          <>
            {messages.map((message) =>
              message.role === "system" ? (
                <div key={message.id} className="flex justify-center">
                  <div className="max-w-[80%] w-full">
                    <div className="flex items-center my-2">
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <p className="mx-3 text-xs text-gray-500 italic text-center whitespace-pre-line">
                        {message.content}
                      </p>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                    {message.status === "sending" && (
                      <div className="mb-2 flex items-center text-xs text-gray-500 animate-in fade-in duration-300">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></div>
                        Sending...
                      </div>
                    )}
                    {message.status === "streaming" && (
                      <div className="mb-2 flex items-center text-xs text-gray-500 animate-in fade-in duration-300">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                        AI is typing...
                      </div>
                    )}
                    {message.status === "error" && (
                      <div className="mb-2 flex items-center text-xs text-red-500 animate-in fade-in duration-300">
                        <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                        Error occurred
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-br-md" : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"}`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p
                          className={`text-xs ${message.role === "user" ? "text-orange-100" : "text-gray-400"}`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {message.status && (
                          <span
                            className={`text-xs ${message.status === "sending" ? "text-yellow-300" : message.status === "sent" ? "text-green-300" : "text-red-300"}`}
                          >
                            {message.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center ml-2 flex-shrink-0 order-2">
                      <span className="text-white font-bold text-xs">B</span>
                    </div>
                  )}
                </div>
              )
            )}

            {(() => {
              const lastMessage = messages[messages.length - 1];
              const shouldShowThinking =
                lastMessage &&
                lastMessage.role === "user" &&
                (lastMessage.status === "sent" || lastMessage.status === "sending") &&
                isConnected;
              return shouldShowThinking ? (
                <div className="flex justify-start animate-in fade-in slide-in-from-left duration-300">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <span className="text-white font-bold text-xs">B</span>
                  </div>
                  <div className="max-w-[80%]">
                    <div className="bg-white text-gray-800 shadow-sm border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </>
        )}

        {cards.length > 0 && (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <CardSelection cards={cards} onCardSelect={handleCardSelect} isLoading={isLoading} />
          </div>
        )}

        {companies.length > 0 && (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <CompanySelection
              companies={companies}
              onCompanySelect={handleCompanySelect}
              onRequestMore={handleRequestMoreCompanies}
              isLoading={isLoading}
            />
          </div>
        )}

        {timeSlots.length > 0 && (
          <div className="animate-in fade-in slide-in-from-left duration-500">
            <AppointmentScheduler
              businessName="Your Selected Company"
              availableSlots={timeSlots}
              onTimeSelect={(slot: TimeSlot) => {
                if (webSocketSingleton.isConnected()) {
                  const timeSlotMessage: ClientEvent = {
                    type: "time.selected",
                    timeSlot: slot,
                    ts: new Date().toISOString(),
                    sessionId: session!.id,
                  };
                  webSocketSingleton.sendMessage(timeSlotMessage);
                }
              }}
              onRequestMore={() => sendMessage("Can you show me more available times?")}
              isLoading={isLoading}
            />
          </div>
        )}

        {showUserPromptImAuthenticated && (
          // center this
          <div className="animate-in fade-in slide-in-from-left duration-500 flex justify-center">
            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50 whitespace-nowrap rounded-full"
              onClick={() => {
                // refresh the window.
                window.location.reload();
                // sendMessage("I am authenticated");
                // setShowUserPromptImAuthenticated(false);
              }}
            >
              I am authenticated
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-2 animate-in slide-in-from-bottom duration-500 delay-300">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50 whitespace-nowrap rounded-full"
            onClick={() => setChatInput("I'm looking for a 3 bedroom house")}
            disabled={!isConnected && isBusy}
          >
            🏠 3 bedroom house
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50 whitespace-nowrap rounded-full"
            onClick={() => setChatInput("Downtown area under $500k")}
            disabled={!isConnected && isBusy}
          >
            📍 Downtown under $500k
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50 whitespace-nowrap rounded-full"
            onClick={() => setChatInput("Schedule a viewing")}
            disabled={!isConnected && isBusy}
          >
            📅 Schedule viewing
          </Button>
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-3 safe-area-pb animate-in slide-in-from-bottom duration-500 delay-400">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-2 mb-1">
            <Plus className="w-5 h-5 text-gray-500" />
          </Button>
          <div className="flex-1 relative">
            <div className="flex items-center">
              <Input
                type="text"
                placeholder={isConnected ? "Message" : "Connecting..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!isConnected && isBusy}
                className="focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
                style={{ minHeight: "24px" }}
              />
            </div>
          </div>
          <Button
            onClick={handleChatMessage}
            disabled={!chatInput.trim() || (!isConnected && isBusy)}
            className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white rounded-full w-11 h-11 p-0 flex items-center justify-center transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none mb-1"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-2 text-center">
          Powered by Easerva • Your service booking made easy.
        </p>
      </div>
    </div>
  );
}
