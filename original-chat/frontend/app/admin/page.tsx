import { createClient } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";
import { ADMIN_USER_IDS } from "../constants/dbConstants";
import AdminReviewClient from "./AdminReviewClient";
import Link from "next/link";

export default async function AdminPage() {
  // Server-side authentication check
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to login
  if (authError || !user) {
    redirect("/login");
  }

  const isAdmin = ADMIN_USER_IDS.includes(user.id);
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <>
      {/* Admin nav bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 text-sm">
        <span className="font-semibold text-gray-900">Admin</span>
        <Link href="/admin" className="text-gray-600 hover:text-gray-900 font-medium">
          Applications Review
        </Link>
        <Link
          href="/admin/kyc"
          className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
        >
          KYC Review
          <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
            New
          </span>
        </Link>
        <Link href="/admin/businesses" className="text-gray-600 hover:text-gray-900 font-medium">
          Businesses
        </Link>
      </nav>
      <AdminReviewClient />
    </>
  );
}
