import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex flex-col">
      {/* Header Skeleton */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton className="h-5 w-20 mb-1" />
              <div className="flex items-center">
                <Skeleton className="h-2 w-2 rounded-full mr-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </header>

      {/* Messages Area Skeleton */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome Message Skeleton */}
        <div className="text-center text-gray-500 mt-8">
          <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-80 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>

        {/* Message Bubbles Skeleton */}
        <div className="space-y-4">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              <Skeleton className="h-12 w-48 rounded-2xl rounded-br-md" />
            </div>
          </div>

          {/* Assistant Message */}
          <div className="flex justify-start">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center ml-2 flex-shrink-0">
              <Skeleton className="h-3 w-3 rounded-full" />
            </div>
            <div className="max-w-[80%] ml-2">
              <Skeleton className="h-16 w-64 rounded-2xl rounded-bl-md" />
            </div>
          </div>

          {/* Another User Message */}
          <div className="flex justify-end">
            <div className="max-w-[80%]">
              <Skeleton className="h-10 w-40 rounded-2xl rounded-br-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="px-4 py-2">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
      </div>

      {/* Input Area Skeleton */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 relative">
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
        <Skeleton className="h-3 w-80 mx-auto mt-2" />
      </div>
    </div>
  );
}
