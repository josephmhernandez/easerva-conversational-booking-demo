import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CardStudioLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar Skeleton */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex justify-between items-center mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>

        {/* Header Skeleton */}
        <div className="text-center mb-8">
          <Skeleton className="h-8 w-80 mx-auto mb-2" />
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>

        {/* Top Toolbar Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-48" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel Skeleton */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-b last:border-b-0">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-5 w-5" />
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-5 w-8" />
                        </div>
                        <Skeleton className="h-4 w-4" />
                      </div>

                      <div className="space-y-2 pb-2">
                        {[1, 2].map((j) => (
                          <div key={j} className="mx-4 border rounded-lg border-gray-200">
                            <div className="p-3 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <Skeleton className="h-4 w-32 mb-1" />
                                  <Skeleton className="h-3 w-16" />
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-8 w-16" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel Skeleton */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* iPhone Frame Skeleton */}
                    <div className="mx-auto w-64 h-[500px] bg-gray-200 rounded-[2.5rem] p-2">
                      <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden">
                        <div className="p-4 h-full">
                          <div className="space-y-4">
                            <div className="text-center">
                              <Skeleton className="h-5 w-24 mx-auto mb-2" />
                              <Skeleton className="h-3 w-32 mx-auto" />
                            </div>
                            <div className="w-full h-48 rounded-lg">
                              <Skeleton className="w-full h-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom Actions Skeleton */}
        <div className="flex justify-between items-center mt-8">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
