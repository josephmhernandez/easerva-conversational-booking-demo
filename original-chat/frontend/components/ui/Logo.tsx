// components/ui/Logo.tsx
import type React from "react";

export function Logo() {
  return (
    <div className="flex items-center space-x-2 min-w-0">
      <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">E</span>
      </div>
      <span className="text-xl font-bold text-gray-900 truncate">Easerva</span>
    </div>
  );
}
