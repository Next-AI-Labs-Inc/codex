#!/usr/bin/env bash

spec_cli_check() {
  local agent_mode=0 feature=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
    -a|--agent)
      agent_mode=1
      shift
      ;;
    -h|--help)
      spec_cli_check_help
      return
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option for spec check: $1"
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
    echo "Feature name is required for spec check. Example: spec check -h && cat clarifications.json | bin/spec check -a \"My Feature\""
    return 1
  fi
  if [[ $agent_mode -eq 1 ]]; then
    spec_cli_require_agent_json || exit 1
  fi
  local slug file
  slug="$(spec_cli_feature_slug "$feature")"
  file="$SNAPSHOT_DIR/$slug.json"
  local auto_input=0
  if spec_cli_has_input_json; then
    auto_input=1
    export SPEC_CLI_AUTO_ACK=1
  fi

  if [[ ! -f "$file" ]]; then
    echo "No snapshot found at $file"
    exit 1
  fi

  echo "== Clarification Check: $feature =="
  mapfile -t questions < <(jq -r '.open_questions[]?' "$file")
  if [[ ${#questions[@]} -eq 0 ]]; then
    echo "No open questions recorded."
    return
  fi

  local -a auto_choices auto_notes
  if [[ $auto_input -eq 1 ]]; then
    mapfile -t auto_choices < <(jq -r '.clarifications.decisions[]?.choice // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null) || true
    mapfile -t auto_notes < <(jq -r '.clarifications.decisions[]?.note // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null) || true
  fi

  local log_file="$CLARIFICATION_DIR/$slug.log"
  for idx in "${!questions[@]}"; do
    local q="${questions[$idx]}"
    echo "Question: $q"
    local choice note
    if [[ $auto_input -eq 1 && -n "${auto_choices[$idx]:-}" ]]; then
      choice="${auto_choices[$idx]}"
      note="${auto_notes[$idx]:-}"
      case "$choice" in
      r|d|e) ;;
      *) choice="" ;; # fallback to prompt
      esac
    fi
    if [[ -z "$choice" ]]; then
      while true; do
        read -rp "(r)esolved / (d)eferred / (e)scalate: " choice
        case "$choice" in
        r|d|e) break ;;
        *) echo "Enter r, d, or e." ;;
        esac
      done
      read -rp "Notes: " note
    fi
    echo "$(spec_cli_timestamp) | $choice | $q | $note" >>"$log_file"
  done
  echo "Clarification log updated at $log_file"

  spec_cli_run_hooks "check_post" "$slug" "clarifications_logged"
}

spec_cli_check_help() {
  cat <<'EOF'
Agent Mode JSON Schema – spec check -a "<feature>"
{
  "clarifications": {
    "decisions": [
      {"choice": "r", "note": "Documented answer"},
      {"choice": "d", "note": "Waiting on dependency"},
      {"choice": "e", "note": "Escalating to user"}
    ]
  }
}

Rules:
- `choice` must be one of r (resolved), d (deferred), e (escalate) in the same order as the snapshot’s open_questions.
- `note` is the explanation that lands in ~/.codex/extensions/spec-tool/clarifications/<feature>.log.

Next step:
  cat clarifications.json | bin/spec check -a "<feature>"
EOF
}
