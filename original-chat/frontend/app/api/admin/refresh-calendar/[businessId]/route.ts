// app/api/admin/refresh-calendar/[businessId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_USER_IDS } from "../../../../constants/dbConstants";
import { SERVICE_CARD_REQUIREMENTS_REFRESH_RPC } from "../../../../constants/apiConstants";
import { createClient } from "../../../../utils/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const supabase = await createClient();

  // ============================================================================
  // 1. AUTHENTICATION & AUTHORIZATION
  // ============================================================================
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_USER_IDS.includes(user.id)) {
    return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
  }

  // ============================================================================
  // 2. GET BUSINESS ID FROM PARAMS
  // ============================================================================
  const { businessId } = await params;

  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }
  try {
    const { error: serviceCardRequirementsRefreshError } = await supabase.rpc(
      SERVICE_CARD_REQUIREMENTS_REFRESH_RPC,
      {
        p_business_id: businessId,
      }
    );

    if (serviceCardRequirementsRefreshError) {
      return NextResponse.json(
        { error: serviceCardRequirementsRefreshError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Calendar refreshed successfully" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to refresh calendar" }, { status: 500 });
  }
}
