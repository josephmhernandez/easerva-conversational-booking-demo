import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header Skeleton */}
      <header className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>

          {/* Save Status */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </header>

      {/* Progress Bar Skeleton */}
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <Skeleton className="h-10 w-96 mb-4" />
            <Skeleton className="h-6 w-full max-w-2xl" />
          </div>

          {/* Business Profile Form */}
          <Card className="mb-8">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Business Name */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>

              {/* Category */}
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>

              {/* Description */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              </div>

              {/* Website */}
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>

              {/* Logo Upload */}
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-20 w-20 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <Skeleton className="h-4 w-12 mb-2" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-full" />
                  ))}
                </div>
              </div>

              {/* Slug */}
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-3 w-64 mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-32" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
