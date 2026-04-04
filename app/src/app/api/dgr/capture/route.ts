import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCookies, testSession } from "@/lib/dgr-client";

/**
 * POST /api/dgr/capture — Receive DGR cookies from bookmarklet/extension.
 *
 * The bookmarklet runs on digital.dgr.gub.uy after login and POSTs
 * document.cookie back to our app. This route validates and stores them.
 *
 * CORS is allowed from digital.dgr.gub.uy only.
 */

export async function POST(req: NextRequest) {
  // Auth via Bearer token (the bookmarklet gets a short-lived token)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const supabase = await createClient();

  // Verify the token belongs to a valid user
  // The token is a Supabase access token passed to the bookmarklet
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const rawCookies = body.cookies;

  if (!rawCookies || typeof rawCookies !== "string") {
    return NextResponse.json(
      { error: "Expected cookies string" },
      { status: 400 },
    );
  }

  const cookies = parseCookies(rawCookies);

  if (!cookies.JSESSIONID || !cookies.GX_CLIENT_ID) {
    return NextResponse.json(
      { error: "DGR cookies not found. Make sure you're on digital.dgr.gub.uy" },
      { status: 422 },
    );
  }

  // Test them
  const valid = await testSession(cookies);
  if (!valid) {
    return NextResponse.json(
      { error: "Cookies received but session is not valid" },
      { status: 422 },
    );
  }

  // Save
  const { error } = await supabase.from("dgr_sessions").upsert(
    {
      user_id: user.id,
      cookies,
      status: "active",
      dgr_ci: "47086104",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "DGR session saved!" });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://digital.dgr.gub.uy",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
