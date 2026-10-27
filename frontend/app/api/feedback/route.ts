type feedback = {
  title: string;
  comments: string;
  sessionId: string;
};
import { createClient } from "@/app/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const feedback: feedback = await req.json();

    // Make sure we have title, comments, and sesssionid
    if (!feedback.title || !feedback.comments || !feedback.sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ensure non are empty strings
    if (
      feedback.title.trim() === "" ||
      feedback.comments.trim() === "" ||
      feedback.sessionId.trim() === ""
    ) {
      return NextResponse.json({ error: "Fields cannot be empty" }, { status: 400 });
    }

    const supabase = await createClient();

    // For feedback, we might want to use service role if policies aren't set up
    // WARNING: Only use service role key for admin operations, never expose it
    // const supabase = createClient(
    //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
    //   process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
    //   { auth: { persistSession: false } }
    // );

    // Check if user is logged in
    // If not, use guest flow to call backend without Authorization
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    // get the user email
    const { data: userData } = await supabase.auth.getUser();

    // get the user id
    const userId = userData?.user?.id;

    console.log("userId", userId);

    // if user is not logged in, use guest flow to call backend without Authorization
    if (!authSession) {
      // return NextResponse.json({error: "Unauthorized"}, {status: 401});
      console.log("user is not logged in");
    }

    console.log("saving feedback");
    console.log("feedback", feedback);
    const { error } = await supabase.from("Feedback").insert({
      session_id: feedback.sessionId,
      title: feedback.title,
      comments: feedback.comments,
      user_id: userId || "guest",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error saving feedback:", error);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ message: "Feedback saved successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error saving feedback:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
