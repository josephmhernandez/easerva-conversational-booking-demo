import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingStrategyLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Skeleton */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="w-12 h-4" />
          </div>
          <Skeleton className="w-full max-w-md mx-auto h-2 mb-6" />
          <Skeleton className="w-96 h-8 mx-auto mb-2" />
          <Skeleton className="w-full max-w-2xl h-4 mx-auto" />
        </div>

        {/* Strategy Cards Skeleton */}
        <div className="grid gap-6 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-8 h-8" />
                    <div>
                      <Skeleton className="w-48 h-6 mb-2" />
                      <Skeleton className="w-64 h-4" />
                    </div>
                  </div>
                  <Skeleton className="w-16 h-6 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Skeleton className="w-24 h-4 mb-3" />
                    <Skeleton className="w-full h-24 rounded-lg" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Skeleton className="w-16 h-4 mb-2" />
                      <div className="space-y-2">
                        <Skeleton className="w-full h-3" />
                        <Skeleton className="w-3/4 h-3" />
                        <Skeleton className="w-5/6 h-3" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Skeleton className="w-8 h-3 mb-2" />
                        <div className="space-y-1">
                          <Skeleton className="w-full h-2" />
                          <Skeleton className="w-3/4 h-2" />
                        </div>
                      </div>
                      <div>
                        <Skeleton className="w-8 h-3 mb-2" />
                        <div className="space-y-1">
                          <Skeleton className="w-full h-2" />
                          <Skeleton className="w-3/4 h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Box Skeleton */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-3">
            <Skeleton className="w-5 h-5 mt-0.5" />
            <div className="flex-1">
              <Skeleton className="w-24 h-4 mb-2" />
              <Skeleton className="w-full h-3 mb-1" />
              <Skeleton className="w-3/4 h-3" />
            </div>
          </div>
        </div>

        {/* Navigation Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="w-24 h-10" />
          <div className="flex items-center space-x-4">
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-24 h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
