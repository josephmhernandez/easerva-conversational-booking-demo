"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

type Variant = "header" | "body" | "quickstart";

export function LandingHeroInteractive({
  variant,
  preset,
  label,
}: {
  variant: Variant;
  preset?: string;
  label?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(preset ?? "");
  const [animating, setAnimating] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0, width: 0 });
  const [bubbleText, setBubbleText] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  const measureTextWidth = (value: string) => {
    if (!measureRef.current) return 200;
    measureRef.current.textContent = value;
    const textWidth = measureRef.current.offsetWidth;
    const maxWidth = typeof window !== "undefined" ? Math.min(window.innerWidth * 0.75, 400) : 300;
    return Math.min(textWidth + 32, maxWidth);
  };

  const go = (finalText: string) => {
    if (!finalText.trim() || animating) return;

    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const w = measureTextWidth(finalText);
      setBubblePosition({ top: rect.top, left: Math.max(rect.right - w, 16), width: w });
    }

    // bridge via sessionStorage
    try {
      sessionStorage.setItem("initial_message", finalText);
    } catch {}

    setBubbleText(finalText);
    setAnimating(true);
    setTimeout(() => router.push("/chat"), 600);
  };

  if (variant === "quickstart") {
    return (
      <Button
        variant="outline"
        className="bg-white text-gray-700 border-gray-200 hover:bg-gray-50 rounded-full text-xs sm:text-sm px-3 sm:px-4 py-2"
        onClick={() => go(preset ?? "")}
      >
        {label ?? preset}
      </Button>
    );
  }

  return (
    <div className="w-full">
      {/* Hidden measure */}
      <span
        ref={measureRef}
        className="fixed invisible text-base font-normal px-4 py-3 whitespace-nowrap pointer-events-none"
        style={{
          fontFamily: "inherit",
          fontSize: "16px",
          fontWeight: 400,
          letterSpacing: "normal",
          top: -9999,
          left: -9999,
        }}
      />
      {/* Bubble */}
      {animating && (
        <div
          className="fixed z-50 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-2xl px-4 py-3 animate-[send_0.6s_ease-out_forwards] text-base font-normal max-w-[75vw] overflow-hidden text-ellipsis"
          style={{
            top: bubblePosition.top,
            left: bubblePosition.left,
            width: bubblePosition.width,
          }}
        >
          {bubbleText}
        </div>
      )}

      <div
        ref={inputRef}
        className={
          variant === "header"
            ? "flex items-center bg-white rounded-2xl shadow-lg border border-gray-100 p-2 focus-within:ring-2 focus-within:ring-orange-300 focus-within:border-orange-300 transition-all w-full"
            : "flex items-center bg-white rounded-2xl shadow-lg p-2 w-full"
        }
      >
        <MessageCircle className="w-5 h-5 text-orange-400 ml-2 sm:ml-4 mr-2 sm:mr-3 flex-shrink-0" />
        <Input
          type="text"
          placeholder={
            variant === "body" ? `Tell us what you're looking for...` : "Describe what you need..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go(text)}
          className="flex-1 border-0 bg-transparent text-sm sm:text-lg placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 min-w-0"
        />
        <Button
          onClick={() => go(text)}
          disabled={!text.trim()}
          className={
            variant === "body"
              ? "bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-3 sm:px-6 py-3 font-medium transition-all text-xs sm:text-sm flex-shrink-0"
              : "bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white rounded-xl px-3 sm:px-6 py-3 font-medium transition-all transform hover:scale-105 disabled:opacity-50 text-xs sm:text-sm flex-shrink-0"
          }
        >
          {variant === "body" ? (
            "Start Now"
          ) : (
            <>
              <span className="hidden sm:inline">Find My Agent</span>
              <span className="sm:hidden">Find</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
