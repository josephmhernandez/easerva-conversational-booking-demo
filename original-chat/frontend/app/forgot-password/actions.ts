"use server";

import { createClient } from "@/app/utils/supabase/server";
import { CUSTOM_EMAIL_TYPE_ID_KEY, FORGOT_PASSWORD_TEMPLATE_ID } from "../constants/apiConstants";

export async function forgotPasswordAction(email: string) {
  const supabase = await createClient();

  const explicitOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const domain = explicitOrigin || process.env.RAILWAY_PUBLIC_DOMAIN || "localhost:3000";
  const origin = domain.startsWith("http")
    ? domain
    : domain.includes("localhost")
      ? `http://${domain}`
      : `https://${domain}`;
  const redirectUrl = `${origin}/auth/confirm?next=/reset-password`;
  console.log("REDIRECTING TO: ", redirectUrl);
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl + CUSTOM_EMAIL_TYPE_ID_KEY + FORGOT_PASSWORD_TEMPLATE_ID,
  });

  if (error) {
    return { error: error.message };
  }

  return { message: "Check your email for the password reset link!" };
}
