"use client";

import { Toaster } from "react-hot-toast";

export function HotToaster() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: "#ffffff",
          color: "#09090b",
          border: "1px solid #e4e4e7",
          borderRadius: "0.75rem",
          padding: "16px",
          fontSize: "14px",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          maxWidth: "420px",
        },

        // Success toast styling
        success: {
          duration: 4000,
          style: {
            background: "#ffffff",
            color: "#09090b",
            border: "1px solid #22c55e",
            borderRadius: "0.75rem",
            padding: "16px",
            fontSize: "14px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
          iconTheme: {
            primary: "#22c55e",
            secondary: "#ffffff",
          },
        },

        // Error/destructive toast styling
        error: {
          duration: 5000,
          style: {
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #ef4444",
            borderRadius: "0.75rem",
            padding: "16px",
            fontSize: "14px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#ffffff",
          },
        },

        // Loading toast styling
        loading: {
          duration: Infinity,
          style: {
            background: "#ffffff",
            color: "#09090b",
            border: "1px solid #e4e4e7",
            borderRadius: "0.75rem",
            padding: "16px",
            fontSize: "14px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
          iconTheme: {
            primary: "#3b82f6",
            secondary: "#ffffff",
          },
        },
      }}
    />
  );
}
