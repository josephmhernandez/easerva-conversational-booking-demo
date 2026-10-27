import { Skeleton } from "@/components/ui/skeleton";

export default function BusinessTeamMembersLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="w-20 h-8 rounded" />
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-16 h-6" />
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-24 h-4" />
          </div>
          <Skeleton className="w-full h-2 rounded-full" />
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {/* Header */}
          <div className="text-center mb-8">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
            <Skeleton className="w-48 h-7 mx-auto mb-2" />
            <Skeleton className="w-64 h-5 mx-auto" />
          </div>

          {/* Important Note */}
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="w-24 h-4 mb-1" />
                <Skeleton className="w-full h-4 mb-1" />
                <Skeleton className="w-3/4 h-4" />
              </div>
            </div>
          </div>

          {/* Team Options */}
          <div className="space-y-4 mb-8">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg"
              >
                <Skeleton className="w-4 h-4 rounded-full" />
                <div className="flex items-center flex-1">
                  <Skeleton className="w-5 h-5 mr-3" />
                  <div className="flex-1">
                    <Skeleton className="w-32 h-5 mb-1" />
                    <Skeleton className="w-48 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Location Tabs */}
          <div className="mb-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          </div>

          {/* Location Info */}
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg mb-6">
            <Skeleton className="w-4 h-4" />
            <div className="flex-1">
              <Skeleton className="w-32 h-5 mb-1" />
              <Skeleton className="w-48 h-4 mb-1" />
              <Skeleton className="w-24 h-3" />
            </div>
          </div>

          {/* Add Form */}
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 mb-6">
            <Skeleton className="w-48 h-5 mb-4" />
            <div className="space-y-4">
              <div>
                <Skeleton className="w-20 h-4 mb-1" />
                <Skeleton className="w-full h-12 rounded" />
              </div>
              <div>
                <Skeleton className="w-16 h-4 mb-1" />
                <Skeleton className="w-full h-12 rounded" />
              </div>
              <div>
                <Skeleton className="w-24 h-4 mb-1" />
                <Skeleton className="w-full h-12 rounded" />
              </div>
              <div>
                <Skeleton className="w-12 h-4 mb-3" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-4 h-4" />
                  <Skeleton className="w-24 h-4" />
                </div>
              </div>
              <Skeleton className="w-full h-10 rounded" />
            </div>
          </div>

          {/* Bulk Import */}
          <div className="text-center mb-6">
            <Skeleton className="w-32 h-8 mx-auto rounded" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <Skeleton className="w-full h-12 rounded" />
          <Skeleton className="w-full h-12 rounded" />
        </div>

        {/* Help Text */}
        <div className="text-center mt-6">
          <Skeleton className="w-80 h-4 mx-auto" />
        </div>
      </div>
    </div>
  );
}
