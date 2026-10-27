"use server";

import {
  CUSTOM_EMAIL_TYPE_ID_KEY,
  INVITE_EMPLOYEE_EXISTING_USER_TEMPLATE_ID,
  INVITE_EMPLOYEE_NEW_USER_TEMPLATE_ID,
} from "@/app/constants/apiConstants";
import { ROUTE_EMPLOYEE_ADD_CALENDAR_PAGE } from "@/app/constants/routeConstants";
import { BusinessesDB, EmployeesDB, ServiceCardsDB } from "@/app/types/db";
import { GeneralServerActionResponse } from "@/app/types/serverAction";
import { createAdminClient, createClient } from "@/app/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
/**
 * Invite Employee Action
 */
interface InviteAllEmployeesToConnectCalendarsResponse {
  success?: boolean;
  error?: string;
}

export async function inviteAllEmployeesToConnectCalendarsAction(
  businessId: string,
  businessName: string
): Promise<InviteAllEmployeesToConnectCalendarsResponse> {
  const supabase = await createClient();

  try {
    // get all employees for the business that are pending calendar connection.
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", businessId)
      .eq("calendar_connection_required", true);

    if (employeesError) {
      console.error("Employees error:", employeesError);
      return { error: "Failed to fetch employees" };
    }
    const employeesList: EmployeesDB[] = employees?.map((employee: EmployeesDB) => employee) || [];

    // invite each employee to connect their calendars.
    for (const employee of employeesList) {
      const response = await inviteEmployeeToConnectCalendar(
        employee.id,
        employee.email,
        businessName,
        businessId
      );
      if (!response.success) {
        console.error("Failed to invite employee to connect calendar:", response.error);
        return { success: false, error: "Failed to invite employee to connect calendar" };
      }
    }
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * HELPER function to invite an employee to connect their calendar.
 * @param employeeId - the employee id to invite
 * @param employeeEmail - the email of the employee to invite
 * @param businessName
 * @param businessId
 * @returns
 */
async function inviteEmployeeToConnectCalendar(
  employeeId: string,
  employeeEmail: string,
  businessName: string,
  businessId: string
): Promise<GeneralServerActionResponse> {
  try {
    const supabaseAdmin = await createClient(true);

    // Check if the users exists in the profiles table.
    console.log(
      "[inviteEmployeeToConnectCalendar] Checking if user exists in profiles table for email:",
      employeeEmail
    );
    const { userId: userIdFromEmail, error: userIdFromEmailError } =
      await getUserIdFromEmail(employeeEmail);
    if (userIdFromEmailError) {
      console.error(
        "[inviteEmployeeToConnectCalendar] Failed to get user id from email:",
        userIdFromEmailError
      );
      return { success: false, error: "Failed to get user id from email" };
    }

    const userExists = userIdFromEmail !== "";
    // DNE: Supabase auth to create user and this will send an invite link to the user.
    let employeeUserId = userIdFromEmail || "";
    if (!userExists) {
      console.log(
        "[inviteEmployeeToConnectCalendar] User does not exist, creating new user and sending invite email"
      );
      const { userId: newUserId, error: newUserIdError } = await createNewUserAndSendInviteEmail(
        supabaseAdmin,
        employeeEmail,
        businessName,
        businessId
      );
      if (newUserIdError || !newUserId) {
        console.error("Failed to create new user:", newUserIdError, "   newUserId: ", newUserId);
        return { success: false, error: "Failed to create new user" };
      }
      employeeUserId = newUserId;
    } else {
      console.log(
        "[inviteEmployeeToConnectCalendar] User exists, sending invite email to existing user:",
        employeeUserId
      );
      const { userId: existingUserId, error: existingUserIdError } =
        await sendEmployeeInviteEmailToExistingUser(
          supabaseAdmin,
          employeeEmail,
          employeeUserId,
          businessName
        );
      if (existingUserIdError || !existingUserId) {
        console.error(
          "[inviteEmployeeToConnectCalendar] Failed to send invite email to existing user:",
          existingUserIdError,
          "   existingUserId: ",
          existingUserId
        );
        return { error: "Failed to send invite email to existing user" };
      }
      employeeUserId = existingUserId;
    }

    console.log(
      "[inviteEmployeeToConnectCalendar] Attaching user:",
      employeeUserId,
      "to employee:",
      employeeId
    );
    const { error: attachUserError } = await attachUserToEmployee(
      supabaseAdmin,
      employeeId,
      employeeUserId
    );
    if (attachUserError) {
      console.error(
        "[inviteEmployeeToConnectCalendar] Failed to attach user to employee:",
        attachUserError
      );
      return { error: "Failed to attach user to employee" };
    }
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export interface BusinessDataResult {
  activeBusiness?: BusinessesDB;
  serviceCards?: ServiceCardsDB[];
  employeesList?: EmployeesDB[];
  error?: string;
}

export async function fetchBusinessDataAction(): Promise<BusinessDataResult> {
  try {
    console.log("Fetching business data...");
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not logged in");
      return { error: "Current user not logged in" };
    }

    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id);

    if (businessError) {
      console.error("Business error:", businessError);
      return { error: "Failed to fetch business" };
    }

    const activeBusiness: BusinessesDB | undefined = businessData?.find(
      (business: BusinessesDB) => business.is_active
    );
    if (!activeBusiness) {
      console.log("No active business found");
      return { error: "No active business found" };
    }

    // Get the service cards for the active business.
    const { data: serviceCards, error: serviceCardsError } = await supabase
      .from("service_cards")
      .select("*")
      .eq("business_id", activeBusiness?.id);
    if (serviceCardsError) {
      console.error("Service cards error:", serviceCardsError);
      return { error: "Failed to fetch service cards" };
    }

    // Get the employees for the active business.
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", activeBusiness?.id);

    if (employeesError) {
      console.error("Employees error:", employeesError);
      return { error: "Failed to fetch employees" };
    }
    const employeesList: EmployeesDB[] = employees?.map((employee: EmployeesDB) => employee) || [];

    return { activeBusiness, serviceCards, employeesList };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * HELPER function to attach a user to an employee
 * @param employeeId - the employee id to attach the user to
 * @param userId - the user id to attach to the employee
 * @returns
 */

export async function attachUserToEmployee(
  supabase: SupabaseClient,
  employeeId: string,
  userId: string
): Promise<GeneralServerActionResponse> {
  // attach the newly created user or existing user to the employee.
  console.log(
    "[attachUserToEmployee] Attaching user to employee:",
    userId,
    "for employee:",
    employeeId
  );
  try {
    const { error: attachUserError } = await supabase
      .from("employees")
      .update({ user_id: userId })
      .eq("id", employeeId);

    if (attachUserError) {
      console.error("[attachUserToEmployee] Failed to attach user to employee:", attachUserError);
      return { success: false, error: "Failed to attach user to employee" };
    }
    console.log("[attachUserToEmployee] User attached to employee successfully");
    return { success: true };
  } catch (error) {
    console.error("[attachUserToEmployee] Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface GetUserIdFromEmailResponse {
  success?: boolean;
  error?: string;
  userId?: string;
}

// Query Supabase to get the user id from the email
async function getUserIdFromEmail(email: string): Promise<GetUserIdFromEmailResponse> {
  try {
    console.log("[getUserIdFromEmail] Getting user id from email:", email.trim());
    const supabaseAdmin = await createAdminClient();
    // Looks at the employees table to get the
    const { data, error } = await supabaseAdmin.rpc("get_profile_id_by_email", {
      user_email_param: email,
    });
    if (error) {
      console.error("[getUserIdFromEmail] Failed to get user id from email:", error);
      return { success: false, error: "Failed to get user id from email" };
    }

    if (!data || data.length === 0) {
      console.error("[getUserIdFromEmail] No data found for email:", email);
      return { success: true, userId: "" };
    }
    return { success: true, userId: data?.[0]?.profile_id };
  } catch (error) {
    console.error("[getUserIdFromEmail] Unexpected error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

function getRedirectUrl(isNewUser: boolean): string {
  // Send invite link for them to log in and set password
  const ultimateDestination = ROUTE_EMPLOYEE_ADD_CALENDAR_PAGE;

  const resetPasswordUrl = `/reset-password?next=${encodeURIComponent(ultimateDestination)}`;

  const domain =
    process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN || "localhost:3000";
  if (domain.includes("localhost")) {
    console.warn("redirect url is using localhost domain");
  }

  const origin = domain.startsWith("http")
    ? domain
    : domain.includes("localhost")
      ? `http://${domain}`
      : `https://${domain}`;

  // auth/confirmation is a page. This generateLink() always uses the Implicit auth flow.
  let redirectUrl = `${origin}/auth/confirmation?next=${
    isNewUser ? encodeURIComponent(resetPasswordUrl) : encodeURIComponent(ultimateDestination)
  }`;

  if (isNewUser) {
    redirectUrl += CUSTOM_EMAIL_TYPE_ID_KEY + INVITE_EMPLOYEE_NEW_USER_TEMPLATE_ID;
  } else {
    redirectUrl += CUSTOM_EMAIL_TYPE_ID_KEY + INVITE_EMPLOYEE_EXISTING_USER_TEMPLATE_ID;
  }

  return redirectUrl;
}

interface CreateNewUserAndSendInviteEmailResponse {
  error?: string;
  userId?: string;
}
async function createNewUserAndSendInviteEmail(
  supabaseAdmin: SupabaseClient,
  employeeEmail: string,
  businessName: string,
  businessId: string
): Promise<CreateNewUserAndSendInviteEmailResponse> {
  console.log(
    "[createNewUserAndSendInviteEmail] User does not exist, creating user and sending invite link"
  );
  try {
    const redirectUrl = getRedirectUrl(true);

    const { data: inviteUserByEmailData, error: inviteUserByEmailError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(employeeEmail, {
        // This data is stored in the users table. so User Metadata and will be saved...
        data: {
          business_id: businessId,
          business_name: businessName,
          invite_type: "employee",
          user_type: "Employee",
        },
        redirectTo: redirectUrl,
      });
    if (inviteUserByEmailError) {
      console.error(
        "[createNewUserAndSendInviteEmail] Failed to invite user by email:",
        inviteUserByEmailError
      );
      return { error: "Failed to invite user by email" };
    }
    console.log(
      "[createNewUserAndSendInviteEmail] Employee invited successfully to connect calendar."
    );
    if (!inviteUserByEmailData?.user?.id) {
      console.error(
        "[createNewUserAndSendInviteEmail] Failed to get employee user id from invite user by email data:",
        inviteUserByEmailData
      );
      return { error: "Failed to get employee user id from invite user by email data" };
    }
    return { userId: inviteUserByEmailData?.user?.id };
  } catch (error) {
    console.error("[createNewUserAndSendInviteEmail] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}

interface SendEmployeeInviteEmailToExistingUserResponse {
  error?: string;
  userId?: string;
}
async function sendEmployeeInviteEmailToExistingUser(
  supabaseAdmin: SupabaseClient,
  employeeEmail: string,
  userId: string,
  businessName: string
): Promise<SendEmployeeInviteEmailToExistingUserResponse> {
  try {
    // User exists. Need to send an invite to join the business.
    const redirectUrl = getRedirectUrl(false);
    console.log(
      "[sendEmployeeInviteEmailToExistingUser] email link generated redirecting to: ",
      redirectUrl
    );
    const { data: inviteLinkData, error: inviteLinkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery", // ← Changed from "magiclink" to "invite"
        email: employeeEmail,
        options: {
          // I don't think this actually matters or does anything. The actual redirect is passed in the invoke("send-email") method
          redirectTo: redirectUrl,
        },
      });

    if (inviteLinkError) {
      console.error("[sendEmployeeInviteEmailToExistingUser] Invite link error:", inviteLinkError);
      return { error: "Failed to send invitation email" };
    }
    console.log("[sendEmployeeInviteEmailToExistingUser] Generated invite link for employee");

    const { error: emailError } = await supabaseAdmin.functions.invoke("send-email", {
      body: {
        user: {
          email: employeeEmail,
        },
        email_data: {
          token: inviteLinkData.properties.email_otp || "",
          token_hash: inviteLinkData.properties.hashed_token || "",
          redirect_to: redirectUrl,
          email_action_type: "recovery",
          business_name: businessName,
        },
      },
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (emailError) {
      console.error("[sendEmployeeInviteEmailToExistingUser] Failed to send email:", emailError);
      return { error: "Failed to send invitation email" };
    }

    console.log(
      "[sendEmployeeInviteEmailToExistingUser] Email sent successfully to employee at email:",
      employeeEmail
    );
    if (!inviteLinkData?.user?.id) {
      console.error(
        "[sendEmployeeInviteEmailToExistingUser] Failed to get employee user id from invite link data:",
        inviteLinkData
      );
      return { error: "Failed to get employee user id from invite link data" };
    }
    return { userId: inviteLinkData?.user?.id };
  } catch (error) {
    console.error("[sendEmployeeInviteEmailToExistingUser] Unexpected error:", error);
    return { error: "An unexpected error occurred" };
  }
}
