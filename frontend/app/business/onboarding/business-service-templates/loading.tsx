export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Skeleton */}
      <header className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Progress Indicator Skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="w-full h-2 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Page Header Skeleton */}
        <div className="text-center mb-8">
          <div className="w-80 h-8 bg-gray-200 rounded mx-auto mb-4 animate-pulse" />
          <div className="w-96 h-6 bg-gray-200 rounded mx-auto animate-pulse" />
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="w-40 h-10 bg-gray-200 rounded animate-pulse" />
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Services List Skeleton */}
        <div className="space-y-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-40 h-6 bg-gray-200 rounded animate-pulse" />
                      <div className="w-16 h-5 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="w-full h-4 bg-gray-200 rounded animate-pulse mb-3" />
                    <div className="flex items-center space-x-6 mb-3">
                      <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="flex space-x-2">
                      <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
                      <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse" />
          <div className="w-24 h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </main>
    </div>
  );
}
