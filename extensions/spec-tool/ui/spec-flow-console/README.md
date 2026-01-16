# Spec Flow Console

This Next.js dashboard lives inside `extensions/spec-tool/ui/spec-flow-console` and visualizes every spec artifact stored under your local spec home (default: `~/.codex/extensions/spec-tool`). It replaces the ad-hoc folder spelunking with a Pulse-style click-to-expand console:

- Reads snapshots (`snapshots/*.json`), clarification logs, prompt logs, and close-out reports directly from disk
- Presents Capture → Clarify → Close stages as nested accordions with prompt-status badges
- Provides download buttons that stream the raw artifact via `/api/spec-flows/[slug]/artifact?type=...`
- Polls every 5 s while mounted so new specs or clarifications appear automatically

## Local Development

```bash
cd extensions/spec-tool/ui/spec-flow-console
pnpm install
pnpm dev
```

The `dev` script automatically frees port `8840` and launches `next dev`. Once running, open `http://localhost:8840/` to review all spec flows.
