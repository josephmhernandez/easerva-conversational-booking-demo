import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewApplicationLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="w-full max-w-md mx-auto mb-6">
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>

          <Skeleton className="h-8 w-80 mx-auto mb-2" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>

        {/* Configuration Summary */}
        <div className="grid gap-6 mb-8">
          {/* Required Items */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommended Items */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Completeness Check */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission Section */}
        <Card className="bg-blue-50 border-blue-200 mb-8">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-3">
                <Skeleton className="h-4 w-4 mt-1" />
                <Skeleton className="h-4 w-80" />
              </div>

              <Skeleton className="w-full h-12" />

              <div className="text-center space-y-2">
                <Skeleton className="h-4 w-72 mx-auto" />
                <Skeleton className="h-3 w-96 mx-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post-Submission Options */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* What Happens Next */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
