import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { ADMIN_USER_IDS, ONBOARDING_DRAFT_STATUS } from "../../constants/dbConstants";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface KycApplication {
  id: string; // onboarding_drafts.id
  business_id: string;
  status: string;
  submitted_at: string;
  updated_at: string;
  businesses: {
    id: string;
    name: string;
    category: string | null;
    owner_id: string;
    kyc_approved: boolean | null;
    kyc_notes: string | null;
    created_at: string;
  };
  // owner email comes from a separate query
  owner_email?: string;
}

export default async function KycAdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const isAdmin = ADMIN_USER_IDS.includes(user.id);
  if (!isAdmin) {
    redirect("/");
  }

  // Fetch all KYC applications with joined business data
  const { data: applications, error } = await supabase
    .from("onboarding_drafts")
    .select(
      `
      id,
      business_id,
      status,
      updated_at,
      businesses (
        id,
        name,
        category,
        owner_id,
        kyc_approved,
        kyc_notes,
        created_at
      )
    `
    )
    .in("status", [
      ONBOARDING_DRAFT_STATUS.SUBMITTED,
      ONBOARDING_DRAFT_STATUS.APPROVED,
      "rejected",
      "changes_requested",
    ])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("KYC page fetch error:", error);
  }

  const allApps = (applications as unknown as KycApplication[]) ?? [];
  const pending = allApps.filter((a) => a.status === ONBOARDING_DRAFT_STATUS.SUBMITTED);
  const approved = allApps.filter((a) => a.status === ONBOARDING_DRAFT_STATUS.APPROVED);
  const rejected = allApps.filter(
    (a) => a.status === "rejected" || a.status === "changes_requested"
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ONBOARDING_DRAFT_STATUS.SUBMITTED:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" /> Pending Review
          </Badge>
        );
      case ONBOARDING_DRAFT_STATUS.APPROVED:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case "changes_requested":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertTriangle className="w-3 h-3 mr-1" /> Changes Requested
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const AppTable = ({ apps }: { apps: KycApplication[] }) => {
    if (apps.length === 0) {
      return <p className="text-gray-500 text-sm py-4">No applications in this category.</p>;
    }

    return (
      <div className="space-y-2">
        {apps.map((app) => (
          <Link key={app.id} href={`/admin/kyc/${app.business_id}`} className="block">
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">
                    {app.businesses?.name ?? "Unnamed Business"}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>{app.businesses?.category ?? "No category"}</span>
                    <span>·</span>
                    <Calendar className="w-3 h-3" />
                    <span>Submitted {formatDate(app.updated_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(app.status)}
                <span className="text-gray-400 text-sm">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin" className="hover:text-gray-700">
              Admin
            </Link>
            <span>/</span>
            <span>KYC Review</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">KYC Review Queue</h1>
          <p className="text-gray-600 mt-1">
            Review and approve business applications before they go live.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{pending.length}</div>
                  <div className="text-xs text-gray-500">Pending Review</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">{approved.length}</div>
                  <div className="text-xs text-gray-500">Approved</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{rejected.length}</div>
                  <div className="text-xs text-gray-500">Rejected / Changes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-blue-600" />
              Pending Review
              {pending.length > 0 && (
                <Badge className="bg-blue-600 text-white">{pending.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppTable apps={pending} />
          </CardContent>
        </Card>

        {/* Approved section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppTable apps={approved} />
          </CardContent>
        </Card>

        {/* Rejected section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <XCircle className="w-5 h-5 text-red-600" />
              Rejected / Changes Requested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppTable apps={rejected} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
