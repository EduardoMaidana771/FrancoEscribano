import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchCatalog,
  CATALOG_ENDPOINTS,
  parseCookies,
  type DgrCookies,
} from "@/lib/dgr-client";

/**
 * GET /api/dgr/catalogs?name=marcas&prefix=
 * Fetches a DGR catalog, using dgr_cache if fresh (<24h).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = req.nextUrl.searchParams.get("name");
  const prefix = req.nextUrl.searchParams.get("prefix") ?? "";

  if (!name || !(name in CATALOG_ENDPOINTS)) {
    return NextResponse.json(
      {
        error: `Invalid catalog name. Valid: ${Object.keys(CATALOG_ENDPOINTS).join(", ")}`,
      },
      { status: 400 },
    );
  }

  const cacheKey = prefix ? `${name}_${prefix}` : name;
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Check cache
  const { data: cached } = await supabase
    .from("dgr_cache")
    .select("data, fetched_at")
    .eq("user_id", user.id)
    .eq("cache_key", cacheKey)
    .gte("fetched_at", oneDayAgo)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ data: cached.data, cached: true, stale: false });
  }

  const { data: staleCached } = await supabase
    .from("dgr_cache")
    .select("data, fetched_at")
    .eq("user_id", user.id)
    .eq("cache_key", cacheKey)
    .maybeSingle();

  // Need fresh data — get DGR session
  const { data: session } = await supabase
    .from("dgr_sessions")
    .select("cookies")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const cookies = session?.cookies
    ? (session.cookies as DgrCookies)
    : process.env.DGR_SHARED_COOKIE_STRING
      ? parseCookies(process.env.DGR_SHARED_COOKIE_STRING)
      : null;

  if (!cookies) {
    if (staleCached) {
      return NextResponse.json({ data: staleCached.data, cached: true, stale: true });
    }
    return NextResponse.json(
      { error: "No active DGR session. Please log in to DGR first." },
      { status: 401 },
    );
  }

  const def = CATALOG_ENDPOINTS[name as keyof typeof CATALOG_ENDPOINTS];
  const queryPrefix = prefix ? `${prefix},,` : "";

  try {
    const data = await fetchCatalog(
      cookies,
      def.endpoint,
      def.elemId,
      queryPrefix,
    );

    // Save to cache
    await supabase.from("dgr_cache").upsert(
      {
        user_id: user.id,
        cache_key: cacheKey,
        data,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,cache_key" },
    );

    return NextResponse.json({ data, cached: false, stale: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (staleCached) {
      return NextResponse.json({ data: staleCached.data, cached: true, stale: true, error: message });
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
