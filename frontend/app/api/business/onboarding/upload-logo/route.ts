// app/api/business/onboarding/upload-logo/route.ts

import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const businessId = formData.get("businessId") as string;

    if (!file || !businessId) {
      return NextResponse.json({ error: "Missing file or businessId" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${businessId}/logo.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("businesses")
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    console.log("Upload data:", uploadData);

    if (uploadError) {
      console.error("Upload to business bucket error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("businesses").getPublicUrl(fileName);

    // Update business with logo URL
    await supabase.from("businesses").update({ logo_url: publicUrl }).eq("id", businessId);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
