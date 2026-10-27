import { Skeleton } from "@/components/ui/skeleton";

export default function ErrorLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <Skeleton className="w-16 h-16 mx-auto mb-4" />
        <Skeleton className="h-8 w-64 mx-auto mb-4" />
        <Skeleton className="h-6 w-96 mx-auto mb-8" />
        <Skeleton className="h-10 w-32 mx-auto" />
      </div>
    </div>
  );
}
