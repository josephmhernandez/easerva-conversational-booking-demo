"use server";
import { createClient } from "@/app/utils/supabase/server";
import { buildExternalUrl } from "@/app/utils/server/request";
import { NextResponse, NextRequest } from "next/server";
import { ROUTE_LOGIN_PAGE } from "@/app/constants/routeConstants";

export async function POST(req: NextRequest) {
  console.log("------------------signout route");
  const supabase = await createClient();

  // Check if a user's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  // Build redirect URL using the external host instead of the internal container host
  const redirectUrl = buildExternalUrl(req, ROUTE_LOGIN_PAGE);

  return NextResponse.redirect(redirectUrl, {
    status: 302,
  });
}
