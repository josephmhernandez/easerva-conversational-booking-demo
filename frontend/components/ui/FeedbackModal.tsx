"use client";

import { useCallback, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  sessionId?: string;
}

export default function FeedbackModal({ open, onClose, sessionId }: FeedbackModalProps) {
  const [title, setTitle] = useState("");
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetState = useCallback(() => {
    setTitle("");
    setComments("");
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    if (loading) return;
    resetState();
    onClose();
  }, [loading, onClose, resetState]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!title.trim() || !comments.trim()) {
        setError("Both title and comments are required");
        return;
      }

      if (!sessionId) {
        setError("No active chat session found. Please start a chat first.");
        return;
      }

      if (comments.length > 2000) {
        setError("Comments must be 2000 characters or less");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            comments: comments.trim(),
            sessionId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to submit feedback");
        }

        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to submit feedback";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [title, comments, sessionId, handleClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Report Bug or Improvement</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-600 text-2xl mb-2">✓</div>
            <p className="text-green-600 font-medium">Feedback submitted successfully!</p>
            <p className="text-gray-500 text-sm mt-1">Thank you for helping us improve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the bug or improvement"
                disabled={loading}
                maxLength={100}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Comments <span className="text-red-500">*</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Describe the bug or improvement in detail. Include steps to reproduce, expected behavior, and any other relevant information."
                disabled={loading}
                maxLength={2000}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              <div className="text-xs text-gray-500 mt-1">{comments.length}/2000 characters</div>
            </div>

            {error && (
              <div className="text-sm text-red-600 mb-4 p-2 bg-red-50 rounded">{error}</div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !title.trim() || !comments.trim()}
                className="flex-1"
              >
                {loading ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        )}

        {sessionId && (
          <div className="text-xs text-gray-400 mt-4">Session ID: {sessionId.slice(0, 8)}...</div>
        )}
      </div>
    </div>
  );
}
