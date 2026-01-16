#!/usr/bin/env bash

spec_cli_capture() {
  local agent_mode=0 feature="" complexity_level=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
    -a|--agent)
      agent_mode=1
      shift
      ;;
    -h|--help)
      spec_cli_capture_help
      return
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option for spec capture: $1"
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
    echo "Feature name is required. Example: spec capture -h && cat capture.json | bin/spec capture -a \"My Feature\""
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
    local normalized_level
    normalized_level=$(jq -er '.complexity_level // empty' "$SPEC_CLI_INPUT_JSON" 2>/dev/null || printf '')
    if ! complexity_level=$(spec_cli_normalize_complexity_level "$normalized_level"); then
      echo "complexity_level must be one of simple|structured|critical in agent JSON."
      exit 1
    fi

    local captured_json
    captured_json="$(
      jq --arg feature "$feature" --arg time "$(spec_cli_timestamp)" --arg level "$complexity_level" '
        .feature = $feature
        | .captured_at = $time
        | .complexity_level = $level
        | if .alignment == null then .alignment = {} else . end
        | .alignment.user_quote = (.alignment.user_quote // .alignment.quote // "")
      ' "$SPEC_CLI_INPUT_JSON"
    )"
    printf '%s\n' "$captured_json" >"$file"

    echo "Snapshot saved to $file"
    echo
    spec_cli_run_hooks "capture_post" "$slug" "snapshot=$file"
    local repo_name paths_preview
    repo_name=$(jq -r '.repo // ""' "$file")
    paths_preview=$(jq -r '.paths[]? // empty' "$file")
    local alignment_quote
    alignment_quote=$(jq -r '.alignment.user_quote // ""' "$file")
    if [[ -n "$alignment_quote" && "$alignment_quote" != "null" ]]; then
      echo "USER INTENT QUOTE (prepend this to every update): \"$alignment_quote\""
    fi
    echo "→ Include these details when you send the status update:"
    echo "  • Feature: $feature"
    echo "  • Repo: ${repo_name}"
    echo "  • Snapshot: $file"
    if [[ -n "$paths_preview" ]]; then
    echo "  • Paths:"
    printf '    - %s\n' $paths_preview
  fi
  echo
  echo "Send the status check now, then continue directly to planning/implementation."
  spec_cli_log_event "$slug" "status_prompt_initial" "snapshot=$file"
  spec_cli_print_next_steps "$complexity_level"
  return
fi

  local alignment_quote alignment_summary alignment_gap
  local -a alignment_constraints alignment_requirements
  spec_cli_alignment_stage "$feature" alignment_quote alignment_summary alignment_gap alignment_constraints alignment_requirements

  spec_cli_run_hooks "capture_pre" "$slug" "feature=$feature"
  spec_cli_prompt_complexity_level complexity_level

  local task_id=""
  if ! spec_cli_load_json_string task_id ".task_id"; then
    read -rp "Task ID (optional): " task_id
  fi
  local repo_name=""
  if ! spec_cli_load_json_string repo_name ".repo"; then
    read -rp "Repo name (e.g., ixcoach-api): " repo_name
  fi
  local paths=()
  if ! spec_cli_load_json_array paths ".paths"; then
    spec_cli_prompt_list "Primary files/paths this spec will touch" paths
  fi

  local intent sentence_count
  if ! spec_cli_load_json_string intent ".intent"; then
    while true; do
      read -rp "Intent (10+ sentences covering goal, why now, success): " intent
      sentence_count=$(echo "$intent" | tr '?!' '..' | tr -s '.' '\n' | grep -c '[A-Za-z0-9]')
      if [[ $sentence_count -ge 10 ]]; then
        break
      fi
      echo "Intent must be at least 10 sentences (currently $sentence_count)."
    done
  fi

  local context=""
  if ! spec_cli_load_json_string context ".context"; then
    read -rp "Context (origin, constraints, leverage): " context
  fi

  local complexity_assessment trimmed_complexity
  if ! spec_cli_load_json_string complexity_assessment ".complexity_assessment"; then
    while true; do
      read -rp "Complexity assessment (state level introduced and why it matches the ask): " complexity_assessment
      trimmed_complexity="$(echo "$complexity_assessment" | tr -d '[:space:]')"
      if [[ -n "$trimmed_complexity" ]]; then
        break
      fi
      echo "Complexity assessment cannot be empty. Describe whether the spec stays simple or introduces additional complexity and why."
    done
  fi

  local stories criteria nfrs deliverables dependencies sequence validations future open_questions
  if ! spec_cli_load_json_array stories ".user_stories"; then
    spec_cli_prompt_list "User Stories (As a ..., I want ..., so that ...)" stories
  fi
  if ! spec_cli_load_json_array criteria ".acceptance_criteria"; then
    spec_cli_prompt_list "Acceptance Criteria / Functional Requirements" criteria
  fi
  if ! spec_cli_load_json_array nfrs ".non_functional_requirements"; then
    spec_cli_prompt_list "Non-Functional Requirements / Constraints" nfrs
  fi
  if ! spec_cli_load_json_array deliverables ".deliverables"; then
    spec_cli_prompt_list "Deliverables" deliverables
  fi
  if ! spec_cli_load_json_array dependencies ".dependencies"; then
    spec_cli_prompt_list "Dependencies" dependencies
  fi
  if ! spec_cli_load_json_array sequence ".sequence"; then
    spec_cli_prompt_list "Sequence / Order of Operations" sequence
  fi
  if ! spec_cli_load_json_array validations ".validation"; then
    spec_cli_prompt_list "Validation & Success Criteria" validations
  fi
  if ! spec_cli_load_json_array future ".future_proofing"; then
    spec_cli_prompt_list "Future-Proofing Notes" future
  fi
  if ! spec_cli_load_json_array open_questions ".open_questions"; then
    spec_cli_prompt_list "Open Questions" open_questions
  fi

  local swarm_tags=""
  if ! spec_cli_load_json_string swarm_tags ".swarm_tags"; then
    read -rp "Swarm tags (comma separated, e.g., builder-ux,data-science) optional: " swarm_tags
  fi
  local meta_summary=""
  if ! spec_cli_load_json_string meta_summary ".meta_summary"; then
    read -rp "Meta-spec summary (one sentence intent+context+stories+requirements): " meta_summary
  fi

  {
    echo "{"
    echo "  \"feature\": \"${feature}\","
    echo "  \"task_id\": \"${task_id}\","
    echo "  \"repo\": \"${repo_name}\","
    echo "  \"paths\": ["
    spec_cli_print_json_array paths
    echo "  ],"
    echo "  \"alignment\": {"
    echo "    \"user_quote\": \"${alignment_quote}\","
    echo "    \"summary\": \"${alignment_summary}\","
    echo "    \"gap\": \"${alignment_gap}\","
    echo "    \"constraints\": ["
    spec_cli_print_json_array alignment_constraints
    echo "    ],"
    echo "    \"requirements\": ["
    spec_cli_print_json_array alignment_requirements
    echo "    ]"
    echo "  },"
    echo "  \"complexity_level\": \"${complexity_level}\","
    echo "  \"intent\": \"${intent}\","
    echo "  \"context\": \"${context}\","
    echo "  \"complexity_assessment\": \"${complexity_assessment}\","
    echo "  \"user_stories\": ["
    spec_cli_print_json_array stories
    echo "  ],"
    echo "  \"acceptance_criteria\": ["
    spec_cli_print_json_array criteria
    echo "  ],"
    echo "  \"non_functional_requirements\": ["
    spec_cli_print_json_array nfrs
    echo "  ],"
    echo "  \"deliverables\": ["
    spec_cli_print_json_array deliverables
    echo "  ],"
    echo "  \"dependencies\": ["
    spec_cli_print_json_array dependencies
    echo "  ],"
    echo "  \"sequence\": ["
    spec_cli_print_json_array sequence
    echo "  ],"
    echo "  \"validation\": ["
    spec_cli_print_json_array validations
    echo "  ],"
    echo "  \"future_proofing\": ["
    spec_cli_print_json_array future
    echo "  ],"
  echo "  \"open_questions\": ["
  spec_cli_print_json_array open_questions
  echo "  ],"
  echo "  \"artifact_links\": [],"
  echo "  \"progress_updates\": [],"
  echo "  \"command_reviews\": [],"
  echo "  \"ux_concerns\": [],"
  echo "  \"action_items\": [],"
  echo "  \"alignment_reviews\": [],"
  echo "  \"swarm_tags\": \"${swarm_tags}\","
  echo "  \"meta_summary\": \"${meta_summary}\","
  echo "  \"captured_at\": \"$(spec_cli_timestamp)\""
  echo "}"
  } >"$file"

  echo "Snapshot saved to $file"

  echo
  spec_cli_run_hooks "capture_post" "$slug" "snapshot=$file"
  if [[ -n "$alignment_quote" ]]; then
    echo "USER INTENT QUOTE (prepend this to every update): \"$alignment_quote\""
  fi
  echo "→ Include these details when you send the status update:"
  echo "  • Feature: $feature"
  echo "  • Repo: $repo_name"
  echo "  • Snapshot: $file"
  if [[ ${#paths[@]} -gt 0 ]]; then
    echo "  • Paths:"
    for p in "${paths[@]}"; do
      echo "    - $p"
    done
  fi
  echo
  echo "Send the status check now, then continue directly to planning/implementation."
  spec_cli_log_event "$slug" "status_prompt_initial" "snapshot=$file"
  spec_cli_print_next_steps "$complexity_level"
}

spec_cli_capture_help() {
  cat <<'EOF'
Agent Mode JSON Schema – spec capture -a "<feature>"
{
  "feature": "Spec CLI Agent Mode Flags",
  "repo": "agent-swarm-mcp",
  "paths": ["extensions/spec-tool/spec-cli.sh", "..."],
  "alignment": {
    "user_quote": "Verbatim intent quote",
    "summary": "UX intent summary",
    "gap": "What is missing",
    "constraints": ["Must ..."],
    "requirements": ["Add -a flag ..."]
  },
  "intent": "10+ sentences covering goal, why now, success definition",
  "context": "Origin + leverage",
  "complexity_assessment": "Why this is the right level",
  "user_stories": ["As a ..., I want ..., so that ..."],
  "acceptance_criteria": ["CLI exposes -a flag", "..."],
  "non_functional_requirements": ["Keep hooks intact"],
  "deliverables": ["Spec CLI help text updated"],
  "dependencies": ["spec-cli-utils"],
  "sequence": ["Add helper", "Update commands"],
  "validation": ["Run spec capture -a"],
  "future_proofing": ["Flags extend to new commands"],
  "open_questions": ["Needs Clarification: ..."],
  "swarm_tags": "agent-cli,workflow",
  "meta_summary": "Agent-first flags across CLI"
}

Next step:
  cat capture.json | bin/spec capture -a "<feature>"
EOF
}
