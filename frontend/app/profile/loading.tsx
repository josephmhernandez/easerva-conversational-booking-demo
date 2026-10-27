import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
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
          <Skeleton className="h-9 w-32" />
        </div>
      </header>

      {/* Profile Settings */}
      <div className="flex items-start justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* Page Title */}
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-80 mx-auto" />
          </div>

          {/* Profile Card */}
          <Card className="bg-white border-0 shadow-xl mb-6">
            <CardContent className="p-8">
              {/* Profile Avatar Section */}
              <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-gray-100">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                {/* Full Name Field */}
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>

                {/* Email Field */}
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-3 w-80 mt-1" />
                </div>

                {/* Phone Number Field */}
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-3 w-72 mt-1" />
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer Skeleton */}
      <footer className="px-4 py-8 sm:px-6 lg:px-8 bg-gray-50/50 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-80 mx-auto" />
        </div>
      </footer>
    </div>
  );
}
