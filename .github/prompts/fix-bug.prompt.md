---
description: "Diagnose and fix a bug with root cause analysis and verification"
agent: "agent"
argument-hint: "Describe the bug: steps to reproduce, expected vs actual behavior..."
---

# Fix Bug

Follow these steps to diagnose and fix a bug:

## Process

1. **Reproduce**: Understand the steps to trigger the bug
2. **Locate**: Search the relevant files — check both component code and API routes
3. **Root cause**: Identify WHY it happens, not just WHERE
4. **Fix**: Make the minimal change needed — don't refactor unrelated code
5. **Verify build**: Run `cd app && npm run build` — must pass with zero errors
6. **Verify lint**: Run `cd app && npm run lint` — no new warnings
7. **Explain**: Describe what caused the bug and how the fix resolves it

## Common Bug Sources in This Project

- **Supabase client mismatch**: Using `client.ts` in server context or vice versa
- **RLS filtering**: Missing `user_id` in client-side queries
- **React state staleness**: Using `router.back()` instead of explicit navigation (cached state)
- **DGR session expiry**: Cookies expire without clear error
- **Type mismatches**: Supabase returns arrays for single-row joins — normalize with `[0]`
