import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CardAssignmentStrategyLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Progress Bar Skeleton */}
        <div className="max-w-md mx-auto mb-8">
          <Skeleton className="w-full h-2 rounded-full" />
          <Skeleton className="w-24 h-4 mx-auto mt-2" />
        </div>

        {/* Header Skeleton */}
        <div className="text-center mb-8">
          <Skeleton className="w-96 h-8 mx-auto mb-2" />
          <Skeleton className="w-80 h-5 mx-auto" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel Skeleton */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="w-48 h-6 mb-4" />

                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-4 h-4 mt-1" />
                        <div className="flex-1">
                          <Skeleton className="w-48 h-5 mb-2" />
                          <Skeleton className="w-full h-4 mb-1" />
                          <Skeleton className="w-64 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Card Count Skeleton */}
            <Card>
              <CardContent className="p-6">
                <Skeleton className="w-64 h-6 mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="w-32 h-4" />
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t">
                  <Skeleton className="w-24 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel Skeleton */}
          <div>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="w-16 h-6" />
                  <Skeleton className="w-48 h-4" />
                </div>

                {/* iPhone Frame Skeleton */}
                <div className="mx-auto w-64 bg-black rounded-[2rem] p-2">
                  <div
                    className="bg-white rounded-[1.5rem] overflow-hidden"
                    style={{ aspectRatio: "9/16" }}
                  >
                    <div className="h-full p-4">
                      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <Skeleton className="w-full h-32" />
                        <div className="p-4">
                          <Skeleton className="w-32 h-5 mb-2" />
                          <Skeleton className="w-24 h-4 mb-2" />
                          <Skeleton className="w-full h-4 mb-3" />
                          <div className="flex gap-2 mb-3">
                            <Skeleton className="w-16 h-6" />
                            <Skeleton className="w-16 h-6" />
                          </div>
                          <Skeleton className="w-full h-10" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Skeleton */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Skeleton className="w-8 h-8" />
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="w-2 h-2 rounded-full" />
                    ))}
                  </div>
                  <Skeleton className="w-8 h-8" />
                </div>

                <div className="text-center mt-4">
                  <Skeleton className="w-24 h-6 mx-auto" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Actions Skeleton */}
        <div className="flex justify-between items-center mt-8">
          <Skeleton className="w-20 h-10" />
          <Skeleton className="w-48 h-10" />
        </div>
      </div>
    </div>
  );
}
