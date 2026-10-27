import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeServiceAssignmentLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-20 h-8 rounded" />
            <div className="flex-1">
              <Skeleton className="w-full h-2 rounded-full" />
              <Skeleton className="w-32 h-4 mt-2" />
            </div>
          </div>

          <Skeleton className="w-96 h-8 mb-2" />
          <Skeleton className="w-full h-5 mb-4" />

          {/* Stats and Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="w-48 h-6 rounded-full" />
            <Skeleton className="w-32 h-6 rounded-full" />
            <Skeleton className="w-48 h-8 rounded" />
            <Skeleton className="w-24 h-8 rounded" />
            <Skeleton className="w-24 h-8 rounded" />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-xl p-6">
            {/* Employee Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div>
                  <Skeleton className="w-32 h-5 mb-1" />
                  <Skeleton className="w-24 h-4" />
                </div>
              </div>
              <Skeleton className="w-32 h-8 rounded" />
            </div>

            {/* Service Assignments */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Skeleton className="w-40 h-5 mb-1" />
                      <Skeleton className="w-24 h-4 mb-2" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-16 h-3" />
                        <Skeleton className="w-12 h-3" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[1, 2].map((j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-4 h-4" />
                          <Skeleton className="w-4 h-4" />
                          <Skeleton className="w-24 h-4" />
                          <Skeleton className="w-12 h-4" />
                          <Skeleton className="w-16 h-4" />
                        </div>
                        <Skeleton className="w-8 h-8 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between items-center mt-8">
          <Skeleton className="w-48 h-10 rounded" />
          <div className="flex gap-3">
            <Skeleton className="w-24 h-10 rounded" />
            <Skeleton className="w-24 h-10 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
