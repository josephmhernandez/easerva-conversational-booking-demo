"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Phone,
  Globe,
  Wrench,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

// Types for the review data (mirrors what the existing /api/business/onboarding/review returns)
interface ReviewData {
  businessInfo: {
    name: string;
    category: string;
    description: string;
    phone: string;
    email: string;
    website: string;
    logoUrl?: string;
    slug: string;
    citySlug?: string;
    categorySlug?: string;
  };
  locations: Array<{
    id: string;
    name: string;
    type: string;
    address?: string;
    resources: Array<{ id: string; name: string; type: string; description: string }>;
  }>;
  services: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    duration: number;
    pricing: { type: string; amount?: number; min?: number; max?: number; displayText?: string };
  }>;
  calendarManagement: {
    summary: {
      totalEmployeeCalendars: number;
      unconfiguredCount: number;
    };
  };
  status: string;
  business_id: string;
}

interface KycActionState {
  loading: boolean;
  error: string | null;
  success: string | null;
}

interface BuildState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

interface KycDetailClientProps {
  businessId: string;
  hasLocationData: boolean;
}

export default function KycDetailClient({ businessId, hasLocationData }: KycDetailClientProps) {
  const router = useRouter();

  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kycNotes, setKycNotes] = useState("");
  const [actionState, setActionState] = useState<KycActionState>({
    loading: false,
    error: null,
    success: null,
  });
  const [buildState, setBuildState] = useState<BuildState>({
    loading: false,
    success: false,
    error: null,
  });
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState("");
  const [slugSaving, setSlugSaving] = useState(false);

  const fetchReviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from the existing review endpoint, filter by businessId
      const res = await fetch("/api/business/onboarding/review");
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`);
      }

      const data = await res.json();
      const app = data.applications?.find(
        (a: { business_id: string }) => a.business_id === businessId
      );

      if (!app) {
        setError("Application not found for this business ID.");
        return;
      }

      setReviewData({
        ...app,
        business_id: businessId,
      });
      setSlugDraft(app.businessInfo?.slug || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load application");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchReviewData();
  }, [fetchReviewData]);

  const handleApprove = async () => {
    if (!confirm("Approve this business? This will set kyc_approved = true and make them eligible for static page builds.")) {
      return;
    }

    setActionState({ loading: true, error: null, success: null });

    try {
      const res = await fetch(`/api/admin/kyc/${businessId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", notes: kycNotes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed");

      setActionState({ loading: false, error: null, success: "Business approved! Static build can now be triggered." });
      fetchReviewData();
    } catch (err) {
      setActionState({
        loading: false,
        error: err instanceof Error ? err.message : "Approval failed",
        success: null,
      });
    }
  };

  const handleReject = async (changeRequest = false) => {
    if (!kycNotes.trim()) {
      setActionState({ loading: false, error: "Notes are required when rejecting or requesting changes.", success: null });
      return;
    }

    const action = changeRequest ? "changes_requested" : "rejected";
    if (!confirm(`${changeRequest ? "Request changes from" : "Reject"} this business?`)) {
      return;
    }

    setActionState({ loading: true, error: null, success: null });

    try {
      const res = await fetch(`/api/admin/kyc/${businessId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: kycNotes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");

      setActionState({
        loading: false,
        error: null,
        success: changeRequest ? "Changes requested. Business has been notified." : "Business rejected.",
      });
      fetchReviewData();
    } catch (err) {
      setActionState({
        loading: false,
        error: err instanceof Error ? err.message : "Action failed",
        success: null,
      });
    }
  };

  const handleTriggerBuild = async () => {
    setBuildState({ loading: true, success: false, error: null });

    try {
      const res = await fetch("/api/internal/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerIds: [businessId] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Build trigger failed");

      setBuildState({ loading: false, success: true, error: null });
    } catch (err) {
      setBuildState({
        loading: false,
        success: false,
        error: err instanceof Error ? err.message : "Build trigger failed",
      });
    }
  };

  const saveSlug = async () => {
    setSlugSaving(true);
    setActionState({ loading: false, error: null, success: null });
    try {
      const res = await fetch(`/api/admin/kyc/${businessId}/slug`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: slugDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update slug");

      setReviewData((prev) =>
        prev
          ? { ...prev, businessInfo: { ...prev.businessInfo, slug: data.slug } }
          : prev
      );
      setIsEditingSlug(false);
      setActionState({ loading: false, error: null, success: "Slug updated." });
    } catch (err) {
      setActionState({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to update slug",
        success: null,
      });
    } finally {
      setSlugSaving(false);
    }
  };

  const formatPrice = (pricing: ReviewData["services"][0]["pricing"]) => {
    if (pricing.displayText) return pricing.displayText;
    if (pricing.type === "free") return "Free";
    if (pricing.type === "fixed" && pricing.amount) return `$${pricing.amount}`;
    if (pricing.type === "variable" && pricing.min != null && pricing.max != null)
      return `$${pricing.min}–$${pricing.max}`;
    return "Price varies";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">{error}</p>
          <Button onClick={() => router.push("/admin/kyc")} variant="outline" className="mt-4">
            Back to KYC Queue
          </Button>
        </div>
      </div>
    );
  }

  const data = reviewData!;
  const isApproved = data.status === "approved" || reviewData?.businessInfo?.name != null && actionState.success?.includes("approved");
  const cronofyConnected = (data.calendarManagement?.summary?.totalEmployeeCalendars ?? 0) > 0 &&
    (data.calendarManagement?.summary?.unconfiguredCount ?? 0) === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin" className="hover:text-gray-700">Admin</Link>
          <span>/</span>
          <Link href="/admin/kyc" className="hover:text-gray-700">KYC Review</Link>
          <span>/</span>
          <span className="text-gray-900">{data.businessInfo.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building className="w-6 h-6" />
              {data.businessInfo.name}
            </h1>
            <p className="text-gray-500 mt-1">{data.businessInfo.category}</p>
          </div>
          <Button onClick={fetchReviewData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {!hasLocationData && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>⚠️ This business has no location data. Static page cannot be generated.</span>
          </div>
        )}

        {/* Action result banners */}
        {actionState.success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {actionState.success}
          </div>
        )}
        {actionState.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {actionState.error}
          </div>
        )}

        {/* Business Profile */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Description</div>
                <div>{data.businessInfo.description || "—"}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-0.5">Slug</div>
                {!isEditingSlug ? (
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{data.businessInfo.slug || "Not set"}</code>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingSlug(true)}>Edit</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      value={slugDraft}
                      onChange={(e) => setSlugDraft(e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                      placeholder="business-slug"
                    />
                    <Button size="sm" onClick={saveSlug} disabled={slugSaving}>
                      {slugSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingSlug(false)}>Cancel</Button>
                  </div>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  URL: https://easerva.com/providers/{data.businessInfo.citySlug || "city-slug"}/{data.businessInfo.categorySlug || "category-slug"}/{data.businessInfo.slug || "slug"}/
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              {data.businessInfo.phone && (
                <span className="flex items-center gap-1 text-gray-600">
                  <Phone className="w-3.5 h-3.5" />
                  {data.businessInfo.phone}
                </span>
              )}
              {data.businessInfo.website && (
                <a
                  href={data.businessInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {data.businessInfo.website}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <span className="flex items-center gap-1 text-gray-600">
                <span className={`w-2 h-2 rounded-full ${cronofyConnected ? "bg-green-500" : "bg-gray-300"}`} />
                Calendar: {cronofyConnected ? "Connected" : "Not connected"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        {data.locations.length > 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Locations ({data.locations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.locations.map((loc) => (
                  <div key={loc.id} className="flex items-start gap-2 text-sm p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{loc.name}</div>
                      {loc.address && <div className="text-gray-500">{loc.address}</div>}
                      <Badge variant="outline" className="text-xs mt-1 capitalize">{loc.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {data.services.length > 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Services ({data.services.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.services.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div>
                      <div className="font-medium">{svc.name}</div>
                      <div className="text-gray-500">{svc.description}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="font-medium text-green-700">{formatPrice(svc.pricing)}</div>
                      <div className="text-xs text-gray-400">{svc.duration} min</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KYC Actions */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">KYC Decision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (required for reject / changes requested)
              </label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter notes for the business owner, or approval notes for internal records..."
                value={kycNotes}
                onChange={(e) => setKycNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleApprove}
                disabled={actionState.loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {actionState.loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Approve
              </Button>

              <Button
                onClick={() => handleReject(true)}
                disabled={actionState.loading}
                variant="outline"
                className="border-yellow-400 text-yellow-700 hover:bg-yellow-50"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Request Changes
              </Button>

              <Button
                onClick={() => handleReject(false)}
                disabled={actionState.loading}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trigger Build (only if approved) */}
        {isApproved && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Static Page Build
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                This business is approved. Trigger a static page build to publish their provider page to{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">easerva.com/providers/...</code>
              </p>

              {buildState.success && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  ✅ Build triggered — page will be live within 2 minutes.
                </div>
              )}
              {buildState.error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {buildState.error}
                </div>
              )}

              <Button
                onClick={handleTriggerBuild}
                disabled={buildState.loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {buildState.loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Trigger Static Build
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
