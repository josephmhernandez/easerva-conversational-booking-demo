import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import { ROUTE_LOGIN_PAGE } from "../constants/routeConstants";
export default async function PrivatePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect(ROUTE_LOGIN_PAGE);
  }
  return <p>Hello {data.user.email}</p>;
}
