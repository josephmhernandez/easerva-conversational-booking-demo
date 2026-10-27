"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface InitialMessageContextType {
  initialMessage: string;
  setInitialMessage: (message: string) => void;
  clearInitialMessage: () => void;
}

const InitialMessageContext = createContext<InitialMessageContextType | undefined>(undefined);

export function InitialMessageProvider({ children }: { children: ReactNode }) {
  const [initialMessage, setInitialMessageState] = useState<string>("");

  const setInitialMessage = (message: string) => {
    setInitialMessageState(message);
  };

  const clearInitialMessage = () => {
    setInitialMessageState("");
  };

  return (
    <InitialMessageContext.Provider
      value={{ initialMessage, setInitialMessage, clearInitialMessage }}
    >
      {children}
    </InitialMessageContext.Provider>
  );
}

export function useInitialMessage() {
  const context = useContext(InitialMessageContext);
  if (context === undefined) {
    throw new Error("useInitialMessage must be used within an InitialMessageProvider");
  }
  return context;
}
