#!/usr/bin/env bash

spec_cli_alignment_stage() {
  local feature="$1"
  local quote_var="$2"
  local summary_var="$3"
  local gap_var="$4"
  local constraints_var="$5"
  local requirements_var="$6"
  local slug
  slug="$(spec_cli_feature_slug "$feature")"

  local alignment_quote alignment_summary alignment_gap
  if spec_cli_has_input_json; then
    spec_cli_load_json_string alignment_quote ".alignment.quote" >/dev/null 2>&1 ||
      spec_cli_load_json_string alignment_quote ".alignment.user_quote" >/dev/null 2>&1 || true
    spec_cli_load_json_string alignment_summary ".alignment.summary" >/dev/null 2>&1 || true
    spec_cli_load_json_string alignment_gap ".alignment.gap" >/dev/null 2>&1 || true
    spec_cli_load_json_array "$constraints_var" ".alignment.constraints" >/dev/null 2>&1 || true
    spec_cli_load_json_array "$requirements_var" ".alignment.requirements" >/dev/null 2>&1 || true

    printf -v "$quote_var" '%s' "$alignment_quote"
    printf -v "$summary_var" '%s' "$alignment_summary"
    printf -v "$gap_var" '%s' "$alignment_gap"
    spec_cli_log_event "$slug" "alignment_recorded" "quote=${alignment_quote:-auto}"
    return
  fi

  echo "== Alignment Check: $feature =="
  spec_cli_show_prompt_file "alignment_command.txt"
  echo
  echo "[ALIGNMENT] Type your alignment statement now. Capture will remain paused until every field below is completed—do not stop or wait for new instructions once you finish."

  if [[ -z "${alignment_quote:-}" ]]; then
    while true; do
      read -rp "Verbatim user intent quote (one sentence): " alignment_quote
      [[ -n "$alignment_quote" ]] && break
      echo "Quote cannot be empty. Paste the user's words verbatim."
    done
  fi

  if [[ -z "${alignment_summary:-}" ]]; then
    while true; do
      read -rp "Alignment summary (use required format): " alignment_summary
      [[ -n "$alignment_summary" ]] && break
      echo "Alignment summary cannot be empty. Follow the AlignmentCheck template."
    done
  fi

  if [[ -z "${alignment_gap:-}" ]]; then
    while true; do
      read -rp "Gap summary (current vs target): " alignment_gap
      [[ -n "$alignment_gap" ]] && break
      echo "Gap summary cannot be empty. Describe the delta between current and desired state."
    done
  fi

  spec_cli_prompt_list "Constraints (one per line)" "$constraints_var"
  spec_cli_prompt_list "Requirements (one per line)" "$requirements_var"

  printf -v "$quote_var" '%s' "$alignment_quote"
  printf -v "$summary_var" '%s' "$alignment_summary"
  printf -v "$gap_var" '%s' "$alignment_gap"

  spec_cli_log_event "$slug" "alignment_recorded" "quote=$alignment_quote"
}
