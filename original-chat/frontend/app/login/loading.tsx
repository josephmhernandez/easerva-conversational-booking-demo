import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header Skeleton */}
      <header className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </header>

      {/* Login Form Skeleton */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Welcome Text */}
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-80 mx-auto mb-4" />
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>

          {/* Login Card */}
          <Card className="bg-white border-0 shadow-xl">
            <CardContent className="p-8">
              {/* Email Field */}
              <div className="mb-6">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>

              {/* Password Field */}
              <div className="mb-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>

              {/* Forgot Password Link */}
              <div className="text-right mb-6">
                <Skeleton className="h-4 w-32 ml-auto" />
              </div>

              {/* Submit Button */}
              <Skeleton className="h-12 w-full rounded-md mb-6" />

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or</span>
                </div>
              </div>

              {/* Toggle to Sign Up */}
              <div className="text-center">
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <Skeleton className="h-4 w-80 mx-auto" />
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <footer className="px-4 py-8 sm:px-6 lg:px-8 bg-gray-50/50 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </footer>
    </div>
  );
}
