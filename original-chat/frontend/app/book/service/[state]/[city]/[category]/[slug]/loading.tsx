import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function BookingPageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Sticky Header Skeleton */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 max-w-4xl mx-auto">
          <div className="w-10 h-10 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {/* Service Summary Card Skeleton */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="flex items-start gap-2 mt-2">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>

        {/* Provider Filter Skeleton */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>

        {/* Calendar Skeleton */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Calendar header */}
              <div className="flex justify-between items-center mb-4">
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
              </div>

              {/* Calendar days header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots Skeleton */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Form Skeleton */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Footer Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="h-12 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
