#!/usr/bin/env bash

: "${SNAPSHOT_DIR:?SNAPSHOT_DIR is required}"
: "${CLARIFICATION_DIR:?CLARIFICATION_DIR is required}"
: "${REPORT_DIR:?REPORT_DIR is required}"
: "${PROMPT_DIR:?PROMPT_DIR is required}"
: "${LOG_DIR:?LOG_DIR is required}"
: "${HOOK_CONFIG:?HOOK_CONFIG is required}"

# macOS Bash 3 shim for mapfile/readarray
if ! builtin type -t mapfile >/dev/null 2>&1; then
  mapfile() {
    local OPTIND opt strip_newline=0
    while getopts ':t' opt; do
      case "$opt" in
      t) strip_newline=1 ;;
      esac
    done
    shift $((OPTIND - 1))
    local arr_name="$1"
    local idx=0 line escaped
    eval "$arr_name=()"
  while IFS= read -r line; do
    [[ $strip_newline -eq 1 ]] && line="${line%$'\r'}"
    printf -v escaped "%q" "$line"
    eval "$arr_name[$idx]=$escaped"
    ((idx++))
  done
  return 0
}
fi

spec_cli_timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

spec_cli_ensure_prereqs() {
  if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required. Install it before running spec-cli."
    exit 1
  fi
  mkdir -p "$SNAPSHOT_DIR" "$CLARIFICATION_DIR" "$REPORT_DIR" "$LOG_DIR"
}

spec_cli_feature_slug() {
  echo "$1" | tr '[:upper:] ' '[:lower:]-'
}

spec_cli_snapshot_file() {
  local slug="$1"
  echo "$SNAPSHOT_DIR/$slug.json"
}

spec_cli_require_snapshot_file() {
  local slug="$1"
  local snapshot
  snapshot="$(spec_cli_snapshot_file "$slug")"
  if [[ ! -f "$snapshot" ]]; then
    echo "Snapshot missing at $snapshot"
    return 1
  fi
  printf '%s\n' "$snapshot"
}

spec_cli_prompt_list() {
  local label="$1"
  local arr_name="$2"
  echo "$label (blank line to finish):"
  local line
  eval "$arr_name=()"
  while true; do
    read -rp "> " line || true
    [[ -z "${line:-}" ]] && break
    printf -v __spec_cli_tmp "%s" "$line"
    eval "$arr_name+=(\"\$__spec_cli_tmp\")"
  done
}

spec_cli_print_json_array() {
  local arr_name="$1"
  eval "local arr=(\"\${${arr_name}[@]}\")"
  local len=${#arr[@]}
  for i in "${!arr[@]}"; do
    local sep=","
    [[ $i -eq $((len - 1)) ]] && sep=""
    printf "    \"${arr[$i]}\"%s\n" "$sep"
  done
}

spec_cli_array_to_json() {
  local arr_name="$1"
  eval "local arr=(\"\${${arr_name}[@]}\")"
  local len=${#arr[@]}
  local json="["
  for i in "${!arr[@]}"; do
    local value="${arr[$i]}"
    json+=$(jq -Rn --arg v "$value" '$v')
    [[ $i -lt $((len - 1)) ]] && json+=","
  done
  json+="]"
  printf '%s' "$json"
}

spec_cli_prompt_block() {
  local prompt="$1"
  printf "%s (blank line to finish):\n" "$prompt" >&2
  local line buffer=""
  while IFS= read -r line; do
    [[ -z "$line" ]] && break
    buffer+="$line"$'\n'
  done
  buffer="${buffer%$'\n'}"
  printf '%s' "$buffer"
}

spec_cli_log_event() {
  local slug="$1"
  local stage="$2"
  local note="$3"
  mkdir -p "$LOG_DIR"
  local log_file="$LOG_DIR/$slug.log"
  echo "$(spec_cli_timestamp) | ${stage} | ${note}" >>"$log_file"
}

spec_cli_show_prompt_file() {
  local prompt_file="$PROMPT_DIR/$1"
  if [[ -f "$prompt_file" ]]; then
    cat "$prompt_file"
  else
    echo "[missing prompt file: $prompt_file]"
  fi
}

spec_cli_has_input_json() {
  [[ -n "${SPEC_CLI_INPUT_JSON:-}" && -f "${SPEC_CLI_INPUT_JSON:-}" ]]
}

spec_cli_load_json_string() {
  local target_var="$1"
  local jq_path="$2"
  if ! spec_cli_has_input_json; then
    return 1
  fi
  local value
  value=$(jq -er "$jq_path" "$SPEC_CLI_INPUT_JSON" 2>/dev/null) || return 1
  printf -v "$target_var" '%s' "$value"
  return 0
}

spec_cli_load_json_array() {
  local target_var="$1"
  local jq_path="$2"
  if ! spec_cli_has_input_json; then
    return 1
  fi
  local array_json
  array_json=$(jq -c "$jq_path // null" "$SPEC_CLI_INPUT_JSON" 2>/dev/null) || return 1
  if [[ "$array_json" == "null" ]]; then
    return 1
  fi
  local tmp
  mapfile -t tmp < <(printf '%s' "$array_json" | jq -r '.[]?') || true
  eval "$target_var=(\"\${tmp[@]}\")"
  return 0
}

spec_cli_run_hooks() {
  local stage="$1"
  local slug="$2"
  local note="$3"
  [[ -f "$HOOK_CONFIG" ]] || return
  local hooks
  hooks=$(jq -r --arg s "$stage" '.[$s][]? | "\(.name)|\(.require_ack // false)|\(.log_note // "")"' "$HOOK_CONFIG" 2>/dev/null) || return
  [[ -z "$hooks" ]] && return
  while IFS='|' read -r prompt_name require_ack log_note; do
    [[ -z "$prompt_name" ]] && continue
    spec_cli_show_prompt_file "${prompt_name}.txt"
    echo
    spec_cli_log_event "$slug" "${stage}:${prompt_name}" "${log_note:-$note}"
    if [[ "$require_ack" == "true" ]]; then
      if [[ -n "${SPEC_CLI_AUTO_ACK:-}" ]]; then
        echo "[auto-acknowledged prompt '${prompt_name}']"
      else
        read -rp "Acknowledge prompt '${prompt_name}' (press Enter to continue): " _
      fi
    fi
  done <<<"$hooks"
}

spec_cli_prompt_lookup() {
  local prompt="$1"
  if [[ -z "$prompt" ]]; then
    echo "Prompt name required."
    return 1
  fi
  spec_cli_show_prompt_file "${prompt}.txt"
}

spec_cli_normalize_complexity_level() {
  local raw="${1:-}"
  raw="$(printf '%s' "$raw" | tr '[:upper:]' '[:lower:]')"
  raw="${raw// /}"
  case "$raw" in
  simple|structured|critical)
    printf '%s' "$raw"
    ;;
  *)
    return 1
    ;;
  esac
}

spec_cli_prompt_complexity_level() {
  local out_var="$1" input normalized
  while true; do
    read -rp "Complexity level (simple/structured/critical): " input
    if normalized=$(spec_cli_normalize_complexity_level "$input"); then
      printf -v "$out_var" '%s' "$normalized"
      return 0
    fi
    echo "Please enter 'simple', 'structured', or 'critical'."
  done
}

spec_cli_print_next_steps() {
  local level="$1"
  [[ -z "$level" ]] && return
  echo
  case "$level" in
  simple)
    cat <<'EOF'
NEXT STEPS – SIMPLE WORK
- Stop the spec workflow now. Ship the change with the standard Status Check template (alignment → UX delta → validation steps).
- Include before/after assets or admin instructions in that update.
- If scope grows beyond a single-screen tweak, rerun `spec capture` and pick Structured or Critical so the heavier prompts fire.
EOF
    ;;
  structured)
    cat <<'EOF'
NEXT STEPS – STRUCTURED WORK
1. Run `spec check <feature>` before touching code/tests.
2. After each UX-impacting slice, run `spec progress <feature>` and log supporting docs via `spec artifact <feature>`.
3. When the review template is filled, run `spec review -a <feature>` to record alignment evidence.
4. Finish with `spec close <feature>` and send the emitted final Status Check referencing the close-out report.
EOF
    ;;
  critical)
    cat <<'EOF'
NEXT STEPS – CRITICAL WORK
1. Break the effort into nested GOAL → SUBGOAL → TASK entries inside the spec snapshot.
2. Before coding, run `spec check <feature>`; after every subgoal, run `spec milestone` plus `spec progress`.
3. Log every doc/runbook with `spec artifact <feature>` so reviewers see the breadcrumbs.
4. Treat `spec review -a <feature>` as a hard blocker before `spec close <feature>`—no review log, no completion.
EOF
    ;;
  esac
}

spec_cli_normalize_status() {
  local value
  value="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  value="${value// /_}"
  value="${value//-/_}"
  case "$value" in
  "")
    echo ""
    ;;
  done|complete|completed)
    echo "done"
    ;;
  shipped|ship)
    echo "shipped"
    ;;
  actionable|action)
    echo "actionable"
    ;;
  "for review"|for_review|review)
    echo "for_review"
    ;;
  proposed|proposal)
    echo "proposed"
    ;;
  blocked|block|fail|failed)
    echo "blocked"
    ;;
  *)
    return 1
    ;;
  esac
}

spec_cli_validate_command_reviews() {
  local json="$1"
  local required=("spec capture" "spec check" "spec progress" "spec artifact" "spec close")
  for cmd in "${required[@]}"; do
    if ! printf '%s' "$json" | jq -e --arg needle "$cmd" '
      map((.command // "") | ascii_downcase) | index($needle | ascii_downcase)
    ' >/dev/null; then
      echo "Missing command review for '$cmd'. Include one entry per core command." >&2
      exit 1
    fi
  done
}

spec_cli_assert_alignment_review() {
  local snapshot="$1"
  local status
  status=$(jq -r '((.alignment_reviews // []) | last // empty | .status // empty)' "$snapshot")
  if [[ -z "$status" ]]; then
    echo "No alignment review recorded. Run 'spec review -h' followed by 'spec review -a <feature>' before closing." >&2
    return 1
  fi
  printf '%s' "$status"
}

spec_cli_require_agent_json() {
  if [[ -t 0 ]]; then
    echo "Agent mode (-a) expects JSON via stdin. Pipe a JSON document into the command."
    return 1
  fi
  local tmp
  tmp=$(mktemp)
  if ! cat >"$tmp"; then
    rm -f "$tmp"
    echo "Failed to read JSON from stdin."
    return 1
  fi
  if [[ ! -s "$tmp" ]]; then
    rm -f "$tmp"
    echo "Agent mode (-a) received empty input."
    return 1
  fi
  export SPEC_CLI_INPUT_JSON="$tmp"
  export SPEC_CLI_AGENT_JSON_TEMP="$tmp"
  export SPEC_CLI_AUTO_ACK=1
}

spec_cli_cleanup_agent_mode() {
  if [[ -n "${SPEC_CLI_AGENT_JSON_TEMP:-}" ]]; then
    rm -f "${SPEC_CLI_AGENT_JSON_TEMP}"
    unset SPEC_CLI_AGENT_JSON_TEMP
  fi
}

spec_cli_confirm_scope() {
  local scope="$1"
  if [[ -z "$scope" ]]; then
    echo "Provide the verbatim request or scope to confirm."
    return 1
  fi
  spec_cli_show_prompt_file "confirm_command.txt"
  echo
  echo "Current scope (verbatim): $scope"
}

spec_cli_completion_prompt() {
  spec_cli_show_prompt_file "completion.txt"
  echo
  read -rp "Feature name (optional, to load user quote): " completion_feature
  local completion_quote=""
  if [[ -n "$completion_feature" ]]; then
    local completion_slug completion_snapshot
    completion_slug="$(spec_cli_feature_slug "$completion_feature")"
    completion_snapshot="$SNAPSHOT_DIR/$completion_slug.json"
    if [[ -f "$completion_snapshot" ]]; then
      completion_quote="$(jq -r '.alignment.user_quote // ""' "$completion_snapshot")"
    fi
  fi
  if [[ -z "$completion_quote" ]]; then
    read -rp "User intent quote (verbatim): " completion_quote
  fi
  read -rp "Specific intent: " intent
  read -rp "Context (where/when): " context
  read -rp "Specific changes performed: " changes
  read -rp "UX before/after result: " ux_change
  read -rp "Intent specifics (why this matters): " intent_specifics
  read -rp "Path to review (URL or file): " review_path
  read -rp "Verification steps (visit/click/notice sequence): " verify_steps
  read -rp "What should reviewers notice: " notice
  read -rp "Failure/bug to confirm absent: " failure
  echo
  echo "\"${completion_quote}\""
  echo "Hey, to ${intent} in ${context} I ${changes} which should ${ux_change} so that ${intent_specifics}. Please visit ${review_path}, ${verify_steps}, notice ${notice}, and confirm that ${failure} did not happen."
  echo
  echo "Remember: run npm run agent-verify before calling the work complete."
}

spec_cli_milestone_prompt() {
  spec_cli_show_prompt_file "milestone_report.txt"
  echo
  read -rp "Feature name: " milestone_feature
  local milestone_quote=""
  if [[ -n "$milestone_feature" ]]; then
    local milestone_slug milestone_snapshot
    milestone_slug="$(spec_cli_feature_slug "$milestone_feature")"
    milestone_snapshot="$SNAPSHOT_DIR/$milestone_slug.json"
    if [[ -f "$milestone_snapshot" ]]; then
      milestone_quote="$(jq -r '.alignment.user_quote // ""' "$milestone_snapshot")"
    fi
  fi
  if [[ -z "$milestone_quote" ]]; then
    read -rp "User intent quote (verbatim): " milestone_quote
  fi
  read -rp "Overarching intent (UX impact): " milestone_main_intent
  read -rp "Subgoal intent (how it ladders up): " milestone_sub_intent
  read -rp "Tasks completed (UX phrasing + emoji): " milestone_tasks
  read -rp "UX before vs after description: " milestone_ux_delta
  read -rp "Verification steps (visit/click/notice): " milestone_verify
  read -rp "New user stories introduced (comma separated or n/a): " milestone_stories
  read -rp "Requirements/constraints honored or deferred: " milestone_requirements
  echo
  echo "\"${milestone_quote}\""
  echo "I am working on ${milestone_main_intent} and I have the following progress."
  echo
  echo "UX INTENT:"
  echo "- Goal → Subgoal → Tasks: ${milestone_main_intent} → ${milestone_sub_intent} → ${milestone_tasks}"
  echo "- UX before vs after: ${milestone_ux_delta}"
  echo "- Verification: ${milestone_verify}"
  echo "- New user stories: ${milestone_stories}"
  echo "- Requirements honored/deferred: ${milestone_requirements}"
  echo
  echo "Share this immediately (minimum 10 sentences) and continue working."
}

spec_cli_print_cheatsheet() {
  local line when action
  printf '%s\n' '-------------------------------------------------------------------------------'
  printf '%-37s | %s\n' 'When' 'Action'
  printf '%s\n' '-------------------------------------------------------------------------------'
  for line in "${CHEATSHEET_ENTRIES[@]}"; do
    when=${line%%|*}
    action=${line#*|}
    printf '%-37s | %s\n' "$when" "$action"
  done
  printf '%s\n' '-------------------------------------------------------------------------------'
}
