import { createClient } from "@/app/utils/supabase/server";
import { ADMIN_USER_IDS } from "@/app/constants/dbConstants";
import { redirect } from "next/navigation";
import RebuildButton from "./RebuildButton";

type BusinessRow = {
  id: string;
  name: string;
  slug: string | null;
  city_slug: string | null;
  category_slug: string | null;
  static_published: boolean | null;
  last_built_at: string | null;
};

export default async function AdminBusinessesPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  if (!ADMIN_USER_IDS.includes(user.id)) redirect("/");
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id,name,slug,city_slug,category_slug,static_published,last_built_at")
    .eq("kyc_approved", true);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Businesses</h1>
      <table className="w-full text-sm border">
        <thead className="bg-gray-50">
          <tr>
            <th>Business Name</th>
            <th>Slug</th>
            <th>City</th>
            <th>Category</th>
            <th>Static Status</th>
            <th>Last Built</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {((businesses || []) as BusinessRow[]).map((b) => {
            const status = b.static_published
              ? "🟢 Published"
              : b.last_built_at
                ? "🔴 Not built"
                : "🟡 Pending";
            const pageUrl = `https://easerva.com/providers/${b.city_slug || "city"}/${b.category_slug || "category"}/${b.slug || ""}/`;
            return (
              <tr key={b.id} className="border-t">
                <td>{b.name}</td>
                <td>{b.slug}</td>
                <td>{b.city_slug}</td>
                <td>{b.category_slug}</td>
                <td>{status}</td>
                <td>{b.last_built_at || "-"}</td>
                <td className="space-x-2">
                  <a href={pageUrl} target="_blank" className="text-blue-600">
                    View Page
                  </a>
                  <RebuildButton businessId={b.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
