"use server";

import { createClient } from "@/app/utils/supabase/server";

export async function resetPasswordAction(
  password: string
): Promise<{ error?: string; message?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: error.message };
  }

  return { message: "Password reset successfully" };
}
