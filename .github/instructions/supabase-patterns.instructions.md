---
description: "Use when working with Supabase client/server setup, authentication, middleware, RLS policies, or database queries. Covers the dual-client pattern, session handling, and table relationships."
applyTo: "**/supabase/**,**/lib/supabase*"
---

# Supabase Patterns

## Dual Client Pattern

The app uses two different Supabase clients depending on execution context:

### Client Components (`"use client"`)
```typescript
import { createClient } from "@/lib/supabase/client";
// Uses createBrowserClient — runs in the browser
const supabase = createClient();
```

### Server Components & API Routes
```typescript
import { createClient } from "@/lib/supabase/server";
// Uses createServerClient with cookies — runs on the server
const supabase = await createClient();
```

**Never import the wrong one.** Browser client on the server won't have auth cookies.

## Middleware (`src/middleware.ts`)

- Runs on every request (except static assets)
- Calls `updateSession()` which refreshes the Supabase auth token
- Redirects unauthenticated users to `/login`
- Allows: `/login`, `/register`, `/auth/callback` without auth

## Row Level Security (RLS)

All tables have RLS enabled. Every query is automatically filtered by the authenticated user's ID. This means:
- No need to manually add `.eq("user_id", user.id)` on the server (RLS handles it)
- But client-side queries DO need the user context (provided by the browser client's session)
- Service role key bypasses RLS — only use it for admin operations

## Database Tables & Relationships

```
profiles ← 1:1 with auth.users (notary settings + counters)
clients ← referenced by transactions (seller_id, seller2_id, buyer_id, buyer2_id)
vehicles ← referenced by transactions (vehicle_id)
transactions ← the core record, links everything
folders ← self-referential (parent_id), organizes files
files ← belongs to folder, optional transaction_id, stores extracted_data
dgr_sessions ← DGR authentication cookies per user
dgr_cache ← cached DGR catalog data with TTL
```

## Common Query Patterns

### Fetch with joins (for transaction list)
```typescript
const { data } = await supabase
  .from("transactions")
  .select("*, seller:clients!seller_id(*), buyer:clients!buyer_id(*), vehicle:vehicles(*)")
  .order("created_at", { ascending: false });
```

### Insert with return
```typescript
const { data, error } = await supabase
  .from("clients")
  .insert({ user_id, full_name, ci_number })
  .select()
  .single();
```

### Storage upload
```typescript
const filePath = `${userId}/${folderId}/${Date.now()}_${fileName}`;
await supabase.storage.from("documents").upload(filePath, file);
```

## Auth Flow

1. User submits login form → `supabase.auth.signInWithPassword()`
2. Supabase sets auth cookies
3. Middleware refreshes session on each request
4. Server components access user via `supabase.auth.getUser()`
5. Registration is disabled — only pre-created accounts work
