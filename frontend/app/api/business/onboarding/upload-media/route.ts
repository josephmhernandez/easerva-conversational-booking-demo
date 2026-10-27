// app/api/business/onboarding/upload-media/route.ts

import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { unlink, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

// Increase timeout for video processing
export const maxDuration = 300; // 5 minutes max for conversion

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
    const cardId = formData.get("cardId") as string;
    const mediaType = formData.get("mediaType") as string;

    if (!file || !businessId || !cardId || !mediaType) {
      return NextResponse.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Existing validation code...

    let fileToUpload = file;
    let finalFileName = `${businessId}/cards/${cardId}/${mediaType}_${Date.now()}.${file.name.split(".").pop()}`;

    // Handle MOV conversion
    if (mediaType === "video" && file.name.toLowerCase().endsWith(".mov")) {
      console.log("Converting MOV to MP4...");

      try {
        // Create temp file paths
        const tempId = randomUUID();
        const tempInputPath = `/tmp/${tempId}.mov`;
        const tempOutputPath = `/tmp/${tempId}.mp4`;

        // Write MOV file to disk
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(tempInputPath, buffer);

        // Convert using FFmpeg
        await new Promise((resolve, reject) => {
          const ffmpeg = spawn("ffmpeg", [
            "-i",
            tempInputPath,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast", // Balance between speed and compression
            "-crf",
            "23", // Good quality
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            "-y", // Overwrite output
            tempOutputPath,
          ]);

          ffmpeg.on("close", (code) => {
            if (code === 0) resolve(true);
            else reject(new Error(`FFmpeg exited with code ${code}`));
          });

          ffmpeg.on("error", reject);

          // Log progress (optional)
          ffmpeg.stderr.on("data", (data) => {
            console.log(`FFmpeg: ${data}`);
          });
        });

        // Read converted file
        const { readFile } = await import("fs/promises");
        const mp4Buffer = await readFile(tempOutputPath);

        // Create new File object from converted buffer
        fileToUpload = new File([mp4Buffer], file.name.replace(".mov", ".mp4"), {
          type: "video/mp4",
        });

        // Update file name
        finalFileName = finalFileName.replace(".mov", ".mp4");

        // Cleanup temp files
        await unlink(tempInputPath).catch(() => {});
        await unlink(tempOutputPath).catch(() => {});

        console.log("MOV to MP4 conversion complete");
      } catch (conversionError) {
        console.error("Video conversion failed:", conversionError);
        // Continue with original MOV file if conversion fails
        // You could also return an error here if you prefer
      }
    }

    // Upload to Supabase (either original or converted file)
    const { error: uploadError } = await supabase.storage
      .from("services")
      .upload(finalFileName, fileToUpload, {
        upsert: true,
        contentType: fileToUpload.type,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("services").getPublicUrl(finalFileName);

    return NextResponse.json({
      url: publicUrl,
      fileName: finalFileName,
      mediaType,
      fileSize: fileToUpload.size,
      originalName: fileToUpload.name,
      wasConverted: file !== fileToUpload,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
