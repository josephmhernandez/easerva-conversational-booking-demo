"use server";

import { createClient } from "@/app/utils/supabase/server";
import { GeneralServerActionResponse } from "@/app/types/serverAction";
import {
  ATTACH_EMPLOYEE_CALENDAR_INTEGRATION_RPC,
  SERVICE_CARD_REQUIREMENTS_REFRESH_RPC,
} from "@/app/constants/apiConstants";

export interface SaveEmployeeCalendarSettingsResponse extends GeneralServerActionResponse {
  message?: string;
}

export async function saveEmployeeCalendarSettings(
  defaultBookingCalendarId: string,
  busyCalendarIds: string[] = []
): Promise<SaveEmployeeCalendarSettingsResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const userId = user.id;

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, business_id, full_name, email")
      .eq("user_id", userId)
      .maybeSingle();

    if (employeeError) {
      console.error("Error fetching employee data:", employeeError);
      return { success: false, error: "Error fetching employee data" };
    }

    const employeeId = employeeData?.id;
    const businessId = employeeData?.business_id;

    // Invoke the two rpc functions for attaching the employee calendar.
    const { error } = await supabase.rpc(ATTACH_EMPLOYEE_CALENDAR_INTEGRATION_RPC, {
      p_business_id: businessId,
      p_employee_id: employeeId,
      p_default_booking_calendar_id: defaultBookingCalendarId,
      // Optional
      p_provider: "cronofy",
      p_busy_calendar_ids: busyCalendarIds,
      p_display_name: `${employeeData?.full_name}'s Work Calendar`,
    });

    if (error) {
      console.error("Error attaching employee calendar integration:", error);
      return { success: false, error: error.message };
    }

    const { error: serviceCardRequirementsRefreshError } = await supabase.rpc(
      SERVICE_CARD_REQUIREMENTS_REFRESH_RPC,
      {
        p_business_id: businessId,
      }
    );

    if (serviceCardRequirementsRefreshError) {
      console.error(
        "Error refreshing service card requirements:",
        serviceCardRequirementsRefreshError
      );
      return { success: false, error: serviceCardRequirementsRefreshError.message };
    }

    return { success: true, message: "Employee calendar integration attached successfully" };
  } catch (error) {
    console.error("Unexpected error saving employee calendar settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
