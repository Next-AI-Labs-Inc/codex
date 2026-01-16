#!/usr/bin/env bash

spec_cli_close() {
  local agent_mode=0 feature=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
    -a|--agent)
      agent_mode=1
      shift
      ;;
    -h|--help)
      spec_cli_close_help
      return
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option for spec close: $1"
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
    echo "Feature name is required for spec close. Example: spec close -h && cat close.json | bin/spec close -a \"My Feature\""
    return 1
  fi
  if [[ $agent_mode -eq 1 ]]; then
    spec_cli_require_agent_json || exit 1
  fi
  local slug snapshot
  slug="$(spec_cli_feature_slug "$feature")"
  snapshot="$SNAPSHOT_DIR/$slug.json"
  local auto_input=0
  if spec_cli_has_input_json; then
    auto_input=1
    export SPEC_CLI_AUTO_ACK=1
  fi

  if [[ ! -f "$snapshot" ]]; then
    echo "Snapshot missing at $snapshot"
    exit 1
  fi

  local alignment_status
  alignment_status=$(spec_cli_assert_alignment_review "$snapshot") || exit 1

  mapfile -t criteria < <(jq -r '.acceptance_criteria[]?' "$snapshot")
  mapfile -t constraints < <(jq -r '.non_functional_requirements[]?' "$snapshot")
  local repo_name user_quote
  repo_name="$(jq -r '.repo // ""' "$snapshot")"
  user_quote="$(jq -r '.alignment.user_quote // ""' "$snapshot")"

  local -a auto_criteria auto_constraint_notes
  local auto_ready="" auto_follow=""
  if [[ $auto_input -eq 1 ]]; then
    mapfile -t auto_criteria < <(jq -r '.close.criteria_status[]? // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null) || true
    mapfile -t auto_constraint_notes < <(jq -r '.close.constraint_notes[]? // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null) || true
    auto_ready=$(jq -r '.close.ready // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    auto_follow=$(jq -r '.close.followups // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi

  echo "== Close-out: $feature =="
  local report="$REPORT_DIR/$slug.md"
  {
    echo "# Close-out Report – $feature"
    echo "- Snapshot: $snapshot"
    echo "- Generated: $(spec_cli_timestamp)"
    echo
    if jq -e '.task_id != ""' "$snapshot" >/dev/null; then
      echo "- Task ID: $(jq -r '.task_id' "$snapshot")"
      echo
    fi
    echo "## Acceptance Criteria"
    for idx in "${!criteria[@]}"; do
      local status=""
      if [[ $auto_input -eq 1 && -n "${auto_criteria[$idx]:-}" ]]; then
        status="${auto_criteria[$idx]}"
      else
        read -rp "Status for criterion $((idx + 1)) (${criteria[$idx]}): " status
      fi
      echo "- [${status}] ${criteria[$idx]}"
    done
    echo
    echo "## Non-Functional Requirements / Constraints"
    for idx in "${!constraints[@]}"; do
      local constraint="${constraints[$idx]}"
      local note=""
      if [[ $auto_input -eq 1 && -n "${auto_constraint_notes[$idx]:-}" ]]; then
        note="${auto_constraint_notes[$idx]}"
      else
        read -rp "Impact/confirmation for constraint \"${constraint}\": " note
      fi
      echo "- ${constraint}: ${note}"
    done
    echo
    local ready=""
    if [[ -n "$auto_ready" ]]; then
      ready="$auto_ready"
    else
      read -rp "Ready for approval? (yes/no): " ready
    fi
    echo "## Approval Readiness: $ready"
    local follow=""
    if [[ -n "$auto_follow" ]]; then
      follow="$auto_follow"
    else
      read -rp "Next follow-up tasks (optional): " follow
    fi
    echo "## Follow-ups: ${follow}"
  } >"$report"
  echo "Close-out report saved to $report"

  echo
  spec_cli_run_hooks "close_post" "$slug" "report=$report"
  echo "→ Reference this report when you send the status update:"
  echo "  • Feature: $feature"
  [[ -n "$repo_name" ]] && echo "  • Repo: $repo_name"
  echo "  • Close-out report: $report"
  spec_cli_log_event "$slug" "status_prompt_final" "report=$report"
  echo "  • Alignment review status: $alignment_status"
  if [[ -n "$user_quote" ]]; then
    echo "USER INTENT QUOTE (prepend to final status): \"$user_quote\""
  fi
}

spec_cli_close_help() {
  cat <<'EOF'
Agent Mode JSON Schema – spec close -a "<feature>"
{
  "close": {
    "criteria_status": [
      "pass",
      "fail: awaiting review",
      "deferred"
    ],
    "constraint_notes": [
      "Still streams prompts, hooks unchanged",
      "Docs updated to mention -a flag"
    ],
    "ready": "yes",
    "followups": "Schedule UX review for CLI output copy"
  }
}

Rules:
- `criteria_status` aligns 1:1 with acceptance_criteria in the snapshot.
- `constraint_notes` aligns 1:1 with non_functional_requirements in the snapshot.
- `ready` is a short yes/no/blocked string.
- `followups` summarizes next tasks (optional but encouraged).

Next step:
  cat close.json | bin/spec close -a "<feature>"
EOF
}
