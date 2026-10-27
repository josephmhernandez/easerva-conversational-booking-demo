import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 overflow-x-hidden">
      {/* Header Skeleton */}
      <header className="px-4 py-6 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center space-x-2 min-w-0">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </header>

      {/* Hero Section Skeleton */}
      <section className="px-4 py-12 sm:px-6 lg:px-8 w-full">
        <div className="max-w-4xl mx-auto text-center w-full">
          {/* Main heading */}
          <div className="mb-6">
            <Skeleton className="h-12 w-full max-w-4xl mx-auto mb-4" />
            <Skeleton className="h-12 w-3/4 mx-auto" />
          </div>

          {/* Subtitle */}
          <Skeleton className="h-6 w-full max-w-2xl mx-auto mb-8" />

          {/* Chat Input */}
          <div className="max-w-2xl mx-auto mb-8 w-full px-2">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-4 w-64 mx-auto mt-3" />
          </div>

          {/* Quick Start Options */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 px-2">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-40 rounded-full" />
          </div>
        </div>
      </section>

      {/* Trust Indicators Skeleton */}
      <section className="px-4 py-8 sm:px-6 lg:px-8 bg-white/50 w-full">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 px-2"
              >
                <Skeleton className="h-6 w-6" />
                <div className="text-center sm:text-left">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Skeleton */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 w-full">
        <div className="max-w-6xl mx-auto w-full">
          <Skeleton className="h-8 w-80 mx-auto mb-12" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-white border-0 shadow-lg w-full">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mr-3 sm:mr-4 flex-shrink-0" />
                    <div className="min-w-0">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Skeleton key={j} className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section Skeleton */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-400 to-pink-500 w-full">
        <div className="max-w-4xl mx-auto text-center w-full">
          <Skeleton className="h-10 w-96 mx-auto mb-6" />
          <Skeleton className="h-6 w-full max-w-2xl mx-auto mb-8" />
          <Skeleton className="h-14 w-full max-w-2xl mx-auto" />
        </div>
      </section>

      {/* Footer Skeleton */}
      <footer className="px-4 py-12 sm:px-6 lg:px-8 bg-gray-50 w-full">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex items-center space-x-4 sm:space-x-6">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <Skeleton className="h-4 w-80 mx-auto" />
          </div>
        </div>
      </footer>
    </div>
  );
}
