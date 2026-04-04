import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testSession, parseCookies, type DgrCookies } from "@/lib/dgr-client";

/**
 * GET  /api/dgr/session — Check current DGR session status
 * POST /api/dgr/session — Save new DGR cookies (after login)
 */

// ── GET: check if stored session is still valid ───────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load stored DGR session
  const { data: session } = await supabase
    .from("dgr_sessions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ status: "no_session", valid: false });
  }

  // Test if cookies still work
  const cookies: DgrCookies = session.cookies as DgrCookies;
  const valid = await testSession(cookies);

  // Update status in DB
  if (!valid && session.status === "active") {
    await supabase
      .from("dgr_sessions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", session.id);
  }

  return NextResponse.json({
    status: valid ? "active" : "expired",
    valid,
    last_checked: new Date().toISOString(),
    dgr_user: session.dgr_ci ?? null,
  });
}

// ── POST: save new DGR cookies ────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  let cookies: DgrCookies;

  if (body.cookie_string) {
    // Accept raw cookie string (e.g. from bookmarklet)
    cookies = parseCookies(body.cookie_string);
  } else if (body.cookies) {
    // Accept structured object
    cookies = body.cookies as DgrCookies;
  } else {
    return NextResponse.json(
      { error: "Provide cookie_string or cookies object" },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!cookies.JSESSIONID || !cookies.GX_CLIENT_ID) {
    return NextResponse.json(
      { error: "Missing required cookies (JSESSIONID, GX_CLIENT_ID)" },
      { status: 400 },
    );
  }

  // Test the cookies
  const valid = await testSession(cookies);
  if (!valid) {
    return NextResponse.json(
      { error: "Cookies are not valid — session may have expired" },
      { status: 422 },
    );
  }

  // Upsert session
  const { error } = await supabase.from("dgr_sessions").upsert(
    {
      user_id: user.id,
      cookies,
      status: "active",
      dgr_ci: body.dgr_ci ?? "47086104",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "active", valid: true });
}
