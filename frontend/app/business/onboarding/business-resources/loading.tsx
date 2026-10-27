import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ChevronLeft } from "lucide-react";

export default function BusinessResourcesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-2">
                <ChevronLeft className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Step 3 of 10</span>
                  <span className="text-sm font-medium text-gray-600">30%</span>
                </div>
                <Progress value={30} className="h-2" />
              </div>
            </div>

            <Skeleton className="h-9 w-80 mb-2" />
            <Skeleton className="h-5 w-96 mb-4" />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Location Tabs */}
          <div className="mb-8">
            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 mb-6">
              <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium flex-1 justify-center">
                <Building2 className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium flex-1 justify-center">
                <Building2 className="h-4 w-4 text-gray-400" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Add Resource Button */}
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-9 w-32" />
            </div>

            {/* Resource Lists */}
            <div className="space-y-6">
              {/* Rooms Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-4 text-gray-400">
                              <Skeleton className="h-4 w-4" />
                            </div>
                            <div>
                              <Skeleton className="h-5 w-32 mb-2" />
                              <div className="flex items-center gap-4">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Equipment Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-4 text-gray-400">
                    <Skeleton className="h-4 w-4" />
                  </div>
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="space-y-2">
                  <Card className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-4 w-4" />
                          <div>
                            <Skeleton className="h-5 w-36 mb-2" />
                            <div className="flex items-center gap-4">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
