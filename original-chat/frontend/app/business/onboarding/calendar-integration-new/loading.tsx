import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarIntegrationLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <Skeleton className="h-4 w-20 mx-auto mb-2" />
            <Progress value={75} className="w-full max-w-md mx-auto mb-4" />
          </div>
          <div className="text-center">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-5 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-32 mx-auto" />
          </div>
        </div>

        {/* Strategy Selector */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Combining Interface */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-32" />
            <div className="text-center flex-1 mx-4">
              <Skeleton className="h-4 w-96 mx-auto mb-1" />
              <Skeleton className="h-3 w-64 mx-auto" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Strategy Content Cards */}
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Services List */}
                <div>
                  <Skeleton className="h-5 w-32 mb-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2].map((j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-6" />
                          <div>
                            <Skeleton className="h-4 w-20 mb-1" />
                            <Skeleton className="h-3 w-12" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-20" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                  <div className="space-y-3">
                    {[1, 2].map((k) => (
                      <div key={k} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <div>
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-10 w-20" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white border-t border-gray-200 p-4 mt-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-20" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
