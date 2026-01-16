#!/usr/bin/env bash

_spec_cli_require_feature_slug() {
  local feature="$1"
  if [[ -z "$feature" ]]; then
    read -rp "Feature name: " feature
  fi
  if [[ -z "$feature" ]]; then
    echo "Feature name is required."
    exit 1
  fi
  printf '%s' "$(spec_cli_feature_slug "$feature")"
}

spec_cli_artifact_link() {
  local agent_mode=0 feature=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
    -a|--agent)
      agent_mode=1
      shift
      ;;
    -h|--help)
      spec_cli_artifact_help
      return
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option for spec artifact: $1"
      return 1
      ;;
    *)
      feature="$1"
      shift
      break
      ;;
    esac
  done
  if [[ $agent_mode -eq 1 && -z "$feature" ]]; then
    echo "Agent mode (-a) requires a feature name. Example: spec artifact -h && cat artifact.json | bin/spec artifact -a \"My Feature\""
    return 1
  fi
  if [[ $agent_mode -eq 1 ]]; then
    spec_cli_require_agent_json || exit 1
  fi
  local slug snapshot
  slug="$(_spec_cli_require_feature_slug "$feature")"
  snapshot="$(spec_cli_require_snapshot_file "$slug")" || exit 1

  local auto_input=0
  if spec_cli_has_input_json; then
    auto_input=1
    export SPEC_CLI_AUTO_ACK=1
  fi

  local artifact_path="" summary="" status="" intent_note=""
  if [[ $auto_input -eq 1 ]]; then
    artifact_path=$(jq -r '.artifact.path // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    summary=$(jq -r '.artifact.summary // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    status=$(jq -r '.artifact.status // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    intent_note=$(jq -r '.artifact.intent // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi

  while [[ -z "$artifact_path" ]]; do
    read -rp "Repo-relative path to artifact/runbook: " artifact_path
    [[ -z "$artifact_path" ]] && echo "Path cannot be empty."
  done

  while [[ -z "$summary" ]]; do
    read -rp "UX-facing summary of this artifact: " summary
    [[ -z "$summary" ]] && echo "Summary cannot be empty."
  done

  if [[ -z "$status" ]]; then
    read -rp "Status (planned/in-progress/shipped) [shipped]: " status
    [[ -z "$status" ]] && status="shipped"
  fi

  if [[ -z "$intent_note" ]]; then
    read -rp "Intent / why this artifact matters: " intent_note
  fi

  local entry_json
  entry_json=$(jq -n \
    --arg id "$(spec_cli_timestamp)" \
    --arg path "$artifact_path" \
    --arg summary "$summary" \
    --arg status "$status" \
    --arg intent "$intent_note" \
    '{id:$id, added_at:$id, path:$path, summary:$summary, status:$status, intent:$intent}')
  local tmp
  tmp=$(mktemp)
  if ! jq --argjson entry "$entry_json" '
    .artifact_links = (.artifact_links // []) |
    .artifact_links += [$entry]
  ' "$snapshot" >"$tmp"; then
    rm -f "$tmp"
    echo "Failed to append artifact entry."
    exit 1
  fi
  mv "$tmp" "$snapshot"
  spec_cli_log_event "$slug" "artifact_link" "$artifact_path"
  echo "Logged artifact for $(basename "$snapshot") → $artifact_path"
}

spec_cli_progress_update() {
  local agent_mode=0 feature=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
    -a|--agent)
      agent_mode=1
      shift
      ;;
    -h|--help)
      spec_cli_progress_help
      return
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Unknown option for spec progress: $1"
      return 1
      ;;
    *)
      feature="$1"
      shift
      break
      ;;
    esac
  done
  if [[ $agent_mode -eq 1 && -z "$feature" ]]; then
    echo "Agent mode (-a) requires a feature name. Example: spec progress -h && cat progress.json | bin/spec progress -a \"My Feature\""
    return 1
  fi
  if [[ $agent_mode -eq 1 ]]; then
    spec_cli_require_agent_json || exit 1
  fi

  local slug snapshot
  slug="$(_spec_cli_require_feature_slug "$feature")"
  snapshot="$(spec_cli_require_snapshot_file "$slug")" || exit 1

  local auto_input=0
  if spec_cli_has_input_json; then
    auto_input=1
    export SPEC_CLI_AUTO_ACK=1
  fi

  if [[ $auto_input -eq 0 ]]; then
    spec_cli_show_prompt_file "progress_update.txt"
    echo
    echo "[status chips] Prefix tasks, concerns, and intent confirmations with labels like [actionable], [done], or [for review] so the UI can render badges."
    echo
  fi

  local quote=""
  if [[ $auto_input -eq 1 ]]; then
    quote=$(jq -r '.progress.quote // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi
  if [[ -z "$quote" || "$quote" == "null" ]]; then
    quote="$(jq -r '.alignment.user_quote // ""' "$snapshot" 2>/dev/null)"
  fi
  if [[ -z "$quote" || "$quote" == "null" ]]; then
    read -rp "User intent quote (verbatim): " quote
  fi

  local overarching="" subgoal="" tech_nuance="" validation_entry="" validation_notice="" validation_failure="" validation_steps="" intent_connection=""
  if [[ $auto_input -eq 1 ]]; then
    overarching=$(jq -r '.progress.overarching // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    subgoal=$(jq -r '.progress.subgoal // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    intent_connection=$(jq -r '.progress.intent_connection // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    tech_nuance=$(jq -r '.progress.tech_nuance // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    validation_entry=$(jq -r '.progress.validation.entry // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    validation_steps=$(jq -r '.progress.validation.steps // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    validation_notice=$(jq -r '.progress.validation.notice // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
    validation_failure=$(jq -r '.progress.validation.requirement // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi
  while [[ -z "$overarching" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.overarching."
      return 1
    fi
    read -rp "Overarching intent (UX phrasing): " overarching
  done
  while [[ -z "$subgoal" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.subgoal."
      return 1
    fi
    read -rp "Subgoal intent (how it ladders up): " subgoal
  done
  while [[ -z "$intent_connection" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.intent_connection."
      return 1
    fi
    intent_connection=$(spec_cli_prompt_block "Explain how this subgoal advances the overarching intent")
    [[ -z "$intent_connection" ]] && echo "Intent laddering cannot be empty."
  done
  while [[ -z "$tech_nuance" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.tech_nuance."
      return 1
    fi
    tech_nuance=$(spec_cli_prompt_block "Technical nuance + how it connects to UX intent")
    [[ -z "$tech_nuance" ]] && echo "Technical nuance cannot be empty."
  done

  local tasks=()
  if [[ $auto_input -eq 1 ]]; then
    mapfile -t tasks < <(jq -r '.progress.tasks[]?' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi
  if [[ ${#tasks[@]} -eq 0 ]]; then
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input must include at least one progress.tasks entry."
      return 1
    fi
    spec_cli_prompt_list "Completed sub-steps (emoji + UX phrasing each line)" tasks
  fi
  if [[ ${#tasks[@]} -eq 0 ]]; then
    echo "At least one completed sub-step is required."
    exit 1
  fi

  local ux_now="" sentence_count=0
  if [[ $auto_input -eq 1 ]]; then
    ux_now=$(jq -r '.progress.ux_now // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi
  while true; do
    if [[ -z "$ux_now" ]]; then
      ux_now=$(spec_cli_prompt_block "Describe the UX now vs. before (min 10 sentences, admin-friendly)")
    fi
    sentence_count=$(printf '%s' "$ux_now" | tr '?!' '..' | tr -s '.' '\n' | grep -c '[A-Za-z0-9]')
    if [[ $sentence_count -ge 10 ]]; then
      break
    fi
    echo "Description must be at least 10 sentences (currently $sentence_count)."
    if [[ $auto_input -eq 1 ]]; then
      exit 1
    fi
    ux_now=""
  done

  while [[ -z "$validation_entry" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.validation.entry."
      return 1
    fi
    read -rp "Validation entry point (URL/path admins should open): " validation_entry
  done
  while [[ -z "$validation_steps" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.validation.steps."
      return 1
    fi
    validation_steps=$(spec_cli_prompt_block "Exact steps (visit/click/notice) for admins to validate")
    [[ -z "$validation_steps" ]] && echo "Validation steps cannot be empty."
  done
  while [[ -z "$validation_notice" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.validation.notice."
      return 1
    fi
    read -rp "What should admins notice (the \"Z\" outcome)? " validation_notice
  done
  while [[ -z "$validation_failure" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.validation.requirement."
      return 1
    fi
    read -rp "Which requirement does that prove and why? " validation_failure
  done

  local requirements_note=""
  if [[ $auto_input -eq 1 ]]; then
    requirements_note=$(jq -r '.progress.requirements // ""' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi
  while [[ -z "$requirements_note" ]]; do
    if [[ $auto_input -eq 1 ]]; then
      echo "Agent mode input missing progress.requirements."
      return 1
    fi
    requirements_note=$(spec_cli_prompt_block "Requirements honored (cite spec bullets) and any deferred items")
    [[ -z "$requirements_note" ]] && echo "Requirements note cannot be empty."
  done

  local new_user_stories=()
  if [[ $auto_input -eq 1 ]]; then
    mapfile -t new_user_stories < <(jq -r '.progress.new_user_stories[]?' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi
  if [[ ${#new_user_stories[@]} -eq 0 && $auto_input -eq 0 ]]; then
    spec_cli_prompt_list "New user stories unlocked (leave blank if none)" new_user_stories
  fi

  local intent_statuses=()
  if [[ $auto_input -eq 1 ]]; then
    mapfile -t intent_statuses < <(jq -r '.progress.intent_statuses[]?' "$SPEC_CLI_INPUT_JSON" 2>/dev/null)
  fi
  if [[ ${#intent_statuses[@]} -eq 0 && $auto_input -eq 0 ]]; then
    spec_cli_prompt_list "Intent confirmations with emoji (one per line)" intent_statuses
  fi
  if [[ ${#intent_statuses[@]} -eq 0 ]]; then
    intent_statuses=("⚠️ Pending explicit intent confirmation.")
  fi

  local timestamp
  timestamp="$(spec_cli_timestamp)"
  local tasks_json statuses_json stories_json
  tasks_json=$(spec_cli_array_to_json tasks)
  statuses_json=$(spec_cli_array_to_json intent_statuses)
  stories_json=$(spec_cli_array_to_json new_user_stories)

  local tasks_summary stories_summary intent_status_block
  tasks_summary=$(IFS=' · '; printf '%s' "${tasks[*]}")
  if [[ ${#new_user_stories[@]} -eq 0 ]]; then
    stories_summary="n/a"
  else
    stories_summary=$(IFS=' | '; printf '%s' "${new_user_stories[*]}")
  fi
  intent_status_block=$(printf '%s\n' "${intent_statuses[@]}")

  render_block=$(
    cat <<EOF
"${quote}"
I am working on ${overarching} and I have the following progress.

UX INTENT
- Goal → Subgoal → Tasks: ${overarching} → ${subgoal} → ${tasks_summary}
- Technical nuance & connection: ${tech_nuance}
- Intent laddering: ${intent_connection}

UX NOW
${ux_now}

VALIDATION
- Entry: ${validation_entry}
- Steps: ${validation_steps}
- Notice: ${validation_notice}
- Requirement proof: ${validation_failure}

REQUIREMENTS
${requirements_note}

Intent statuses:
${intent_status_block}

New user stories: ${stories_summary}
EOF
  )

  local entry_json
  entry_json=$(jq -n \
    --arg id "$timestamp" \
    --arg ts "$timestamp" \
    --arg quote "$quote" \
    --arg overarching "$overarching" \
    --arg subgoal "$subgoal" \
    --arg intent_connection "$intent_connection" \
    --arg tech "$tech_nuance" \
    --arg ux "$ux_now" \
    --arg validation_entry "$validation_entry" \
    --arg validation_steps "$validation_steps" \
    --arg validation_notice "$validation_notice" \
    --arg validation_requirement "$validation_failure" \
    --arg requirements "$requirements_note" \
    --arg render "$render_block" \
    --argjson tasks "$tasks_json" \
    --argjson statuses "$statuses_json" \
    --argjson stories "$stories_json" \
    '{id:$id,timestamp:$ts,user_quote:$quote,overarching_intent:$overarching,subgoal_intent:$subgoal,intent_connection:$intent_connection,technical_nuance:$tech,ux_now:$ux,validation_entry:$validation_entry,validation_steps:$validation_steps,validation_notice:$validation_notice,validation_requirement:$validation_requirement,requirements_note:$requirements,tasks_completed:$tasks,intent_statuses:$statuses,new_user_stories:$stories,render_text:$render}')

  local tmp
  tmp=$(mktemp)
  if ! jq --argjson entry "$entry_json" '
    .progress_updates = (.progress_updates // []) |
    .progress_updates += [$entry]
  ' "$snapshot" >"$tmp"; then
    rm -f "$tmp"
    echo "Failed to append progress update."
    exit 1
  fi
  mv "$tmp" "$snapshot"
  spec_cli_log_event "$slug" "progress_update" "progress:${timestamp}"

  echo
  echo "Progress update logged. Share this with the requester:"
  echo "------------------------------------------------------"
  echo "$render_block"
  echo "------------------------------------------------------"
}

spec_cli_artifact_help() {
  cat <<'EOF'
Agent Mode JSON Schema – spec artifact -a "<feature>"
{
  "artifact": {
    "path": "docs/spec-cli-agent-mode.md",
    "summary": "Explains how to run spec CLI with -a and -h flags",
    "status": "shipped",
    "intent": "Gives admins a canonical reference for the new workflow"
  }
}

Fields:
- `path` is repo-relative and required.
- `summary` is the UX-facing description that lands in the snapshot.
- `status` defaults to shipped (planned/in-progress/shipped allowed).
- `intent` explains why the artifact matters to the user/admin experience.

Next step:
  cat artifact.json | bin/spec artifact -a "<feature>"
EOF
}

spec_cli_progress_help() {
  cat <<'EOF'
Agent Mode JSON Schema – spec progress -a "<feature>"
{
  "progress": {
    "quote": "Optional override for the user quote",
    "overarching": "UX intent driving the work",
    "subgoal": "Subgoal that ladders up to the intent",
    "intent_connection": "Narrative tying subgoal → intent",
    "tech_nuance": "Technical nuance and why it matters to UX",
    "tasks": ["✅ Added -a flag parser", "⚙️ Wired stdin ingestion"],
    "ux_now": "10+ sentences describing before/after UX state",
    "validation": {
      "entry": "Path or URL for admins",
      "steps": "Step-by-step instructions",
      "notice": "What success looks like",
      "requirement": "Which requirement that proves"
    },
    "requirements": "Call out spec bullets met/deferred",
    "new_user_stories": ["As a reviewer, I can run spec capture -a ..."],
    "intent_statuses": ["✅ Intent confirmed: agents now see -h prompts"]
  }
}

All listed fields are required except `new_user_stories`. Make sure `ux_now` is at least 10 sentences and `tasks` has ≥1 entry.

Next step:
  cat progress.json | bin/spec progress -a "<feature>"
EOF
}
