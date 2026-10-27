import { NextRequest, NextResponse } from "next/server";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

/**
 * POST /api/internal/rebuild
 *
 * Triggers an incremental static page build for specific provider IDs.
 * Called from the KYC admin UI (T-005) after approving a business.
 *
 * Auth: X-Internal-Key header validated against INTERNAL_REBUILD_SECRET env var.
 *
 * Body: { providerIds: string[] }
 *
 * Environment variables required:
 *   INTERNAL_REBUILD_SECRET  — shared secret for internal calls (see Secrets Doc)
 *   AWS_LAMBDA_FUNCTION_NAME — e.g. "easerva-build-pipeline-qa"
 *   AWS_REGION               — e.g. "us-east-1"
 *   AWS_ACCESS_KEY_ID        — IAM user with lambda:InvokeFunction
 *   AWS_SECRET_ACCESS_KEY    — IAM user secret
 */

interface RebuildBody {
  providerIds: string[];
}

export async function POST(request: NextRequest) {
  // Auth: validate internal key
  const internalKey = request.headers.get("x-internal-key");
  const expectedKey = process.env.INTERNAL_REBUILD_SECRET;

  // If INTERNAL_REBUILD_SECRET is set, enforce it
  // If not set (dev/staging without lambda), skip the check and log a warning
  if (expectedKey) {
    if (!internalKey || internalKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[rebuild] INTERNAL_REBUILD_SECRET is not set — skipping auth check");
  }

  // Parse body
  let body: RebuildBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { providerIds } = body;

  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    return NextResponse.json(
      { error: "providerIds must be a non-empty array of UUIDs" },
      { status: 400 }
    );
  }

  // Check Lambda config
  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME;
  const awsRegion = process.env.AWS_REGION ?? "us-east-1";

  if (!functionName) {
    console.warn("[rebuild] AWS_LAMBDA_FUNCTION_NAME is not set — build not triggered");
    return NextResponse.json(
      {
        success: false,
        message:
          "Lambda function name not configured — build skipped (configure AWS_LAMBDA_FUNCTION_NAME)",
      },
      { status: 200 }
    );
  }

  try {
    const client = new LambdaClient({
      region: awsRegion,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // fall back to instance role / env if running on Railway with AWS_* set
    });

    // Invoke Lambda asynchronously (Event type — fire and forget)
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "Event", // async — don't wait for completion
      Payload: JSON.stringify({
        httpMethod: "POST",
        body: JSON.stringify({ providerIds }),
      }),
    });

    const response = await client.send(command);

    if (response.StatusCode !== 202) {
      throw new Error(`Lambda invocation returned status ${response.StatusCode}`);
    }

    console.log(`[rebuild] Lambda triggered for ${providerIds.length} providers:`, providerIds);

    return NextResponse.json({
      success: true,
      message: "Build triggered — page will be live within 2 minutes",
      providerIds,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[rebuild] Lambda invocation error:", err);
    return NextResponse.json({ error: `Failed to trigger build: ${message}` }, { status: 500 });
  }
}
