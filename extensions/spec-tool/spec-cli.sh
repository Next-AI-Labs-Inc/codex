#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEC_TOOL_HOME="${CODEX_SPEC_TOOL_HOME:-$HOME/.codex/extensions/spec-tool}"
SNAPSHOT_DIR="$SPEC_TOOL_HOME/snapshots"
CLARIFICATION_DIR="$SPEC_TOOL_HOME/clarifications"
REPORT_DIR="$SPEC_TOOL_HOME/reports"
PROMPT_DIR="$ROOT_DIR/prompts"
LOG_DIR="$SPEC_TOOL_HOME/logs"
HOOK_CONFIG="$ROOT_DIR/config/stage-hooks.json"

CHEATSHEET_ENTRIES=(
  "Session start|\`swarm\` → \`spec capture -h\` → \`spec capture -a <feature>\`"
  "Need alignment reminder|Run \`spec prompt alignment_command\`"
  "Filling capture template|Run \`spec capture -h\` for schema + prompts"
  "Need swarm reminder only|Run \`spec prompt capture_swarm\`"
  "After each substantive progress chunk|Run \`spec prompt status_check\`"
  "Before touching code/tests|\`spec check -h\` → \`spec check -a <feature>\`"
  "Clarification logged, keep shipping|Run \`spec prompt check_continue\`"
  "New UX story can be tested|Run \`spec milestone\`"
  "Need milestone prompt text|Run \`spec prompt milestone_report\`"
  "Shipped doc/runbook to repo|\`spec artifact -h\` → \`spec artifact -a <feature>\`"
  "Closed a UX-impacting sub-step|\`spec progress -h\` → \`spec progress -a <feature>\`"
  "Alignment evidence ready|\`spec review -h\` → \`spec review -a <feature>\`"
  "Certainty <90% about user intent|Run \`spec confirm \"verbatim scope\"\`"
  "Need Confirm Command wording|Run \`spec prompt confirm_command\`"
  "Need other prompt reference|Run \`spec prompt <name>\`"
  "Subtask or task complete|Run \`spec completion\` + \`npm run agent-verify\`"
  "Need completion prompt text|Run \`spec prompt completion\`"
  "Ready for final handoff|\`spec close -h\` → \`spec close -a <feature>\` → \`spec prompt close_status\`"
  "Reviewing uncommitted work|Run \`spec prompt review_capture\` and follow the Review Specs flow"
  "Need workflow reminders|Run \`spec cheatsheet\`"
  "Lost? check help|Run \`spec -help\` for table"
)

LIB_DIR="$ROOT_DIR/lib"
source "$LIB_DIR/spec-cli-utils.sh"
source "$LIB_DIR/spec-cli-alignment.sh"
source "$LIB_DIR/spec-cli-capture.sh"
source "$LIB_DIR/spec-cli-check.sh"
source "$LIB_DIR/spec-cli-close.sh"
source "$LIB_DIR/spec-cli-updates.sh"
source "$LIB_DIR/spec-cli-review.sh"

spec_cli_ensure_prereqs
trap spec_cli_cleanup_agent_mode EXIT

cmd="${1:-help}"
shift || true

case "$cmd" in
capture)
  spec_cli_capture "$@"
  ;;
check)
  spec_cli_check "$@"
  ;;
close)
  spec_cli_close "$@"
  ;;
confirm)
  spec_cli_confirm_scope "$@"
  ;;
completion)
  spec_cli_completion_prompt
  ;;
milestone)
  spec_cli_milestone_prompt
  ;;
artifact)
  spec_cli_artifact_link "$@"
  ;;
progress)
  spec_cli_progress_update "$@"
  ;;
review)
  spec_cli_review "$@"
  ;;
prompt)
  spec_cli_prompt_lookup "$@"
  ;;
cheatsheet)
  spec_cli_print_cheatsheet
  ;;
help|-help|--help)
  cat <<'EOF'
Usage: spec-cli.sh <command> [args]

Agents:
  - Run `<command> -h` to view the JSON schema + next-step reminder.
  - Pipe JSON into `<command> -a <feature>` for non-interactive mode.
  - Skip flags only when you intentionally need the interactive fallback.

Commands:
  capture [-h|-a] <feature>      Capture intent, stories, requirements, etc.
  check   [-h|-a] <feature>      Resolve or defer open questions.
  close   [-h|-a] <feature>      Record completion status vs. spec.
  artifact[-h|-a] <feature>      Log repo docs/runbooks for this spec.
  progress[-h|-a] <feature>      Record UX completion logs + validation steps.
  review  [-h|-a] <feature>      Document alignment evidence before close-out.
  confirm "<scope>"              Show the Confirm Command template with scope.
  completion                     Produce the Task Completion Module template.
  milestone                      Produce the Milestone Completion Report template.
  prompt <name>                  Display any stored prompt (e.g., confirm_command).
  cheatsheet                     Show workflow trigger → command mapping.
  help                           Show this message.
EOF
  spec_cli_print_cheatsheet
  ;;
*)
  cat <<'EOF'
Usage: spec-cli.sh <command> [args]
(run `bin/spec --help` for full command list and cheatsheet)
EOF
  ;;
esac
