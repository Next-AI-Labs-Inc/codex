#!/usr/bin/env bash

spec_cli_review() {
  local agent_mode=0 feature=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
    -a|--agent)
      agent_mode=1
      shift
      ;;
    -h|--help)
      spec_cli_review_help
      return
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option for spec review: $1"
      return 1
      ;;
    *)
      feature="$1"
      shift
      break
      ;;
    esac
  done

  if [[ -z "$feature" ]]; then
    echo "Feature name is required. Example: spec review -h && cat review.json | bin/spec review -a \"My Feature\""
    return 1
  fi

  if [[ $agent_mode -eq 0 ]]; then
    echo "Spec review currently supports agent mode only. Pipe JSON via stdin using -a."
    return 1
  fi

  spec_cli_require_agent_json || exit 1

  local slug snapshot
  slug="$(spec_cli_feature_slug "$feature")"
  snapshot="$(spec_cli_require_snapshot_file "$slug")" || exit 1

  local review_title review_reasoning review_status review_progress_ref
  if ! review_title=$(jq -er '.alignment_review.title // empty' "$SPEC_CLI_INPUT_JSON"); then
    echo "alignment_review.title is required in the JSON payload."
    exit 1
  fi
  if ! review_reasoning=$(jq -er '.alignment_review.reasoning // empty' "$SPEC_CLI_INPUT_JSON"); then
    echo "alignment_review.reasoning is required in the JSON payload."
    exit 1
  fi
  review_status=$(
    jq -er '.alignment_review.status // empty' "$SPEC_CLI_INPUT_JSON" 2>/dev/null || printf ''
  )
  review_progress_ref=$(
    jq -er '.alignment_review.progress_reference // empty' "$SPEC_CLI_INPUT_JSON" 2>/dev/null || printf ''
  )
  [[ -z "$review_status" ]] && review_status="for_review"

  local normalized_status
  normalized_status="$(spec_cli_normalize_status "$review_status")" || {
    echo "Invalid alignment review status: $review_status"
    exit 1
  }

  local command_reviews ux_concerns action_items review_evidence
  command_reviews=$(jq -c '.command_reviews // []' "$SPEC_CLI_INPUT_JSON")
  ux_concerns=$(jq -c '.ux_concerns // []' "$SPEC_CLI_INPUT_JSON")
  action_items=$(jq -c '.action_items // []' "$SPEC_CLI_INPUT_JSON")
  review_evidence=$(jq -c '.alignment_review.evidence // []' "$SPEC_CLI_INPUT_JSON")

  if [[ "$command_reviews" == "[]" ]]; then
    echo "command_reviews must include at least one entry."
    exit 1
  fi

  spec_cli_validate_command_reviews "$command_reviews"

  local timestamp
  timestamp="$(spec_cli_timestamp)"
  local tmp
  tmp=$(mktemp)
  if ! jq --argjson cmd "$command_reviews" \
    --argjson concerns "$ux_concerns" \
    --argjson actions "$action_items" \
    --argjson evidence "$review_evidence" \
    --arg title "$review_title" \
    --arg reasoning "$review_reasoning" \
    --arg status "$normalized_status" \
    --arg progress "$review_progress_ref" \
    --arg ts "$timestamp" '
      .command_reviews = $cmd
      | .ux_concerns = $concerns
      | .action_items = $actions
      | .alignment_reviews = (.alignment_reviews // [])
      | .alignment_reviews += [{
          id: $ts,
          created_at: $ts,
          title: $title,
          status: $status,
          reasoning: $reasoning,
          progress_reference: $progress,
          evidence: $evidence
        }]
    ' "$snapshot" >"$tmp"; then
    rm -f "$tmp"
    echo "Failed to record alignment review."
    exit 1
  fi

  mv "$tmp" "$snapshot"
  spec_cli_log_event "$slug" "alignment_review" "status=$normalized_status"
  echo "Recorded alignment review for $feature with status '$normalized_status'."
}

spec_cli_review_help() {
  cat <<'EOF'
Agent Mode JSON Schema – spec review -a "<feature>"
{
  "command_reviews": [
    {
      "command": "spec capture",
      "intent": "Why this command exists",
      "validation": "Exact evidence you ran",
      "status": "done|actionable|for_review|blocked",
      "notes": "Additional findings",
      "next_action": "Optional follow-up"
    }
  ],
  "ux_concerns": [
    {"title": "Agent can see tasks instantly with COMMAND for any task", "status": "actionable", "notes": "UI should hide detail until expanded"}
  ],
  "action_items": [
    {"id": "task-filter-cli", "title": "Add CLI filter syntax", "status": "actionable", "notes": "Support feature -id 7 -actionable"}
  ],
  "alignment_review": {
    "title": "Command alignment review",
    "reasoning": "Tie the command evidence back to the user intent",
    "status": "done|actionable|for_review|blocked",
    "progress_reference": "progress update id or timestamp",
    "evidence": [
      "Capture -h/-a parity validated",
      "Progress updates logged with [status] chips"
    ]
  }
}

Tips:
- Ensure every command in the workflow (capture, check, progress, artifact, close) appears in command_reviews.
- Prefix statuses inside your progress/tasks with bracketed labels (e.g., [actionable]) so the UI can render chips.
- Run `spec review -h` → `spec review -a <feature>` before `spec close`; the close command now blocks if no alignment review is present.
EOF
}
