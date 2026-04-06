---
description: "Implement a new feature following project patterns and conventions"
agent: "agent"
argument-hint: "Describe the feature to implement..."
---

# Implement New Feature

Follow these steps to implement a new feature in the FrancoEscribano project:

## Process

1. **Understand the request**: Clarify what the feature does and which components it affects
2. **Explore existing code**: Read related files to understand current patterns before writing new code
3. **Check types**: Review `app/src/lib/types.ts` — add new interfaces there if needed
4. **Implement**: Follow project conventions:
   - Server Components by default, `"use client"` only when needed
   - Supabase `server.ts` for server code, `client.ts` for client components
   - Tailwind inline classes (blue-600 primary, gray neutrals)
   - Lucide icons (size 16-20)
5. **Verify**: Run `cd app && npm run build` to confirm no TypeScript errors
6. **Test manually**: Describe how to test the feature

## Conventions

- All types in `@/lib/types.ts`
- API routes as Route Handlers in `app/api/`
- Dashboard pages in `(dashboard)/` route group
- State with `useState`, no global state lib
- Forms as controlled components
