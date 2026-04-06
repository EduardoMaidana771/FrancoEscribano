---
description: "Run validation checks and deploy to production via GitHub Actions"
agent: "agent"
tools: [execute, read, search]
---

# Deploy to Production

## Pre-deploy Checklist

Run these checks sequentially. Stop on any failure.

1. **Lint**: `cd app && npm run lint` — must pass with no errors
2. **Build**: `cd app && npm run build` — must compile successfully
3. **Git status**: `git status` — confirm changes are expected

## Deploy

1. Stage changes: `git add -A`
2. Commit with descriptive message: `git commit -m "type: description"`
3. Push to master: `git push origin master`
4. Monitor: `gh run list --limit 1` — wait for GitHub Actions to complete with ✓

## Post-deploy

- Verify the site is live: `escribanofranco.vercel.app`
- Check the deployed pages load correctly
- Report the deployment result

## Commit Message Convention

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance, config changes
- `refactor:` — code change that doesn't add feature or fix bug
