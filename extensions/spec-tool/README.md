# Spec Dev Add-on (V1)

This Spec Tool is bundled as an extension and stores **all user specs locally** under `~/.codex/extensions/spec-tool/`. No internal company specs are shipped in this repo. Removing the folder removes the tooling but leaves local user data intact.

## Workflow (Agent Journey)

0. **Alignment check (before everything)**
   - Triggered automatically when you run `bin/spec capture "<feature>"`.
   - Reads the **alignment_command** prompt. You must quote the user’s words verbatim (one sentence), translate intent/target/gap/constraints/requirements into the required format, and log them.
   - The verbatim quote is stored with the spec and must prefix every future status/completion message.

1. **Capture before coding**
   - Run `bin/spec capture "<feature name>"`.
   - CLI shows the **capture_swarm** prompt. Run `swarm`, then press Enter to continue.
   - Required inputs per meta-spec:
     - 10+ sentence intent paragraph (goal, why now, what success looks like) using only verifiable facts from the task description, linked artifacts, or prior clarified scope—never invent rationale.
     - Context (origin, constraints, strategic leverage) plus repo name and the precise files/paths the work will touch
     - **Complexity assessment** that states what degree of complexity you are introducing (simple / moderate / advanced, etc.), whether that level is justified relative to the original ask, and why. If the spec remains simple, say so explicitly.
     - User stories (“As a … I want … so that …”)
     - Acceptance criteria / functional requirements
     - Non-functional requirements / constraints
     - Deliverables, dependencies, sequence/order
     - Validation metrics, future-proofing notes, meta-spec summary sentence
     - Open questions + swarm tags
     - Remember: memory logs exist to understand existing constraints within the assigned scope, not to expand scope. Any uncertainty becomes `[Needs Clarification: ...]`.
- Output: `~/.codex/extensions/spec-tool/snapshots/<feature>.json`
   - Immediately after capture, the CLI prints the Status Check template (`prompts/status_check.txt`) plus the stored user quote so you can prepend it to your update. Send the alignment-informed status, then move straight into implementation.

2. **Clarification gate**
   - Run `bin/spec check "<feature name>"` before touching code or tests.
   - For each open question the script asks:
     - mark as Resolved / Deferred / Escalated
     - add notes (decision, link, next action)
- Log written to `~/.codex/extensions/spec-tool/clarifications/<feature>.log`
- CLI prints `prompts/check_continue.txt`, reminding you to document blockers but keep shipping. Prompt emission is logged under `~/.codex/extensions/spec-tool/logs/<feature>.log`.

3. **Milestone reporting (while working)**
   - Whenever you complete a substantive chunk of UX-visible work, run `bin/spec milestone`.
   - The CLI shows `prompts/milestone_report.txt` and prints the stored user quote.
   - Produce a minimum-10-sentence UX narrative (goal → subgoal → tasks, verification steps, new user stories, requirements honored). Send it immediately, then keep working.

4. **Progress + artifact logging (close the loop while building)**
   - Every time you finish a UX-impacting sub-step, run `bin/spec progress "<feature>"`.
     - The prompt (`prompts/progress_update.txt`) forces you to restate the UX intent, describe the technical nuance, provide a 10+ sentence “UX now vs before” paragraph, spell out validation steps (“Go to…, click…, notice…”) and list emoji-tagged intent confirmations plus any new user stories.
     - The command writes the full block to the snapshot’s `progress_updates` array so the Epic UI can display the status immediately. It also prints the formatted text so you can post it verbatim.
   - When you create or update supporting docs/runbooks, run `bin/spec artifact "<feature>"`.
     - This records repo-relative paths, summaries, and intent notes under `artifact_links`, making the UI surface those links without hunting through commits.
   - Run these two commands before you send status updates so observers see the same data the moment they refresh the console.

5. **Close-out before task completion**
   - Run `bin/spec close "<feature name>"` prior to calling `task-complete`.
   - Prompts walk through each acceptance criterion and constraint, asking for completion status and any impact notes.
- Report saved to `~/.codex/extensions/spec-tool/reports/<feature>.md` (attach or reference when marking tasks done).
   - CLI prints `prompts/close_status.txt`, instructing you to send the final Status Check referencing the report. The prompt emission is logged.
6. **Mandatory review step (uncommitted or pre-commit work)**
   - Immediately after `spec close`, load the review template with `bin/spec prompt review_capture`.
   - The template (see **Review Specs** below) is purpose-built for evaluating uncommitted work against the original UX intent. It forces you to restate every goal/subgoal → task chain in UX-first language, provide the exact “go to…, click…, notice…” validation steps, and answer the alignment/incompleteness/principles/questions checklist.
   - Copy the completed review block into your final status update and attach it under `progress_updates` or the close-out report so the review lives with the spec.
   - When answering the “code principles” question, run `swarm -v "patterns" -c --limit 100` to cite the relevant memory before you declare compliance or list a violation.

## End-to-End Automation Reference

| Stage | Command(s) | Automated Inputs/Prompts | Artifact Produced |
| --- | --- | --- | --- |
| Alignment capture | `bin/spec capture "<feature>"` (auto-runs `prompts/alignment_command.txt` + `capture_swarm.txt`) | Verbatim user quote, intent/context paths, complexity rating, stories, acceptance/constraints, validation + open questions | `~/.codex/extensions/spec-tool/snapshots/<feature>.json` with `alignment`, `intent`, `requirements`, `open_questions` |
| Clarification gate | `bin/spec check "<feature>"` (`prompts/check.txt`) + `prompts/check_continue.txt` | Forces choice per question (Resolved/Deferred/Escalated) with decision notes | `~/.codex/extensions/spec-tool/clarifications/<feature>.log` entries plus updated snapshot state |
| Milestone/posture tracking | `bin/spec milestone` (`prompts/milestone_report.txt`) | 10+ sentence UX-first milestone summary with validation steps | Inline narrative you paste into status + CLI log entry |
| Incremental progress logging | `bin/spec progress "<feature>"` + `prompts/progress_update.txt` | UX intent, technical nuance, verification checklist, emoji intent states, new user stories | `progress_updates` array inside snapshot enabling console/UI parity |
| Artifact linking | `bin/spec artifact "<feature>"` | Repo-relative doc/runbook references + intent notes | `artifact_links` in snapshot to surface docs automatically |
| Completion modules | `bin/spec completion` + `prompts/completion.txt` | Task Completion template reminding you to run `npm run agent-verify` | Completion transcript saved locally for copy/paste |
| Close-out | `bin/spec close "<feature>"` + `prompts/close.txt`/`close_status.txt` | Acceptance vs. actual completion, constraint notes, follow-ups | `~/.codex/extensions/spec-tool/reports/<feature>.md` close report + prompt log |
| Review (new) | `bin/spec prompt review_capture` | Review-spec template for uncommitted work (verbatim instructions below) | Review block appended to close status + stored alongside spec artifacts |

This table is now the single place that enumerates *every* automated hand-off: which command to run, which prompt fires, and where the data lands so other agents (or the UI) can trust the spec stream end to end.

## Files & Folders

| Path | Purpose |
| --- | --- |
| `spec-cli.sh` | CLI wrapper for capture/check/close/confirm/completion/prompt commands (requires `jq`) |
| `snapshots/` | JSON specs per feature (`feature-name.json`) |
| `clarifications/` | Timestamped logs of question resolutions (`spec-cli check`) |
| `reports/` | Close-out summaries used during approvals |
| `prompts/` | Text prompts (capture template, capture_swarm, status_check, check_continue, close_status, confirm command, completion module, etc.) |
| `config/stage-hooks.json` | Declares which prompts fire at capture/check/close stages |
| `logs/` | Records of when each stage prompt was displayed per feature |

### Additional commands
- `bin/spec confirm "verbatim scope"` – prints the Confirm Command instructions plus the scope you should acknowledge before acting.
- `bin/spec milestone` – generates the Milestone Completion Report template so you can send UX intent / verification updates mid-task.
- `bin/spec completion` – walks through the Task Completion Module template; run this after every completed milestone/subtask with UX impact. It automatically pulls the user quote from the snapshot (or asks you) and reminds you to list the exact verification steps (visit/click/notice) plus `npm run agent-verify`.
- `bin/spec prompt <name>` – displays any stored prompt (example: `bin/spec prompt status_check`).
- `bin/spec cheatsheet` – prints the trigger → command mapping so agents always know the next step.
- `bin/spec prompt review_capture` – displays the dedicated review-spec template for uncommitted work so you can generate the UX-intent-aligned audit block.

## Review Specs (Uncommitted Work)

Specialized review specs let you inspect uncommitted changes using the same automation scaffolding as delivery specs while making the UX intent explicit for every nested goal. Follow this pattern whenever you are asked to “review some work” or “confirm compliance”:

1. **Prep and capture intent**
   - Run `bin/spec prompt review_capture` before you touch anything. This ensures you capture the verbatim instructions (“Please review the associated code…”) exactly as required.
   - Then run `bin/spec capture "<feature name> – review"` so the snapshot logs the review context, repo paths you inspected, and any requirements/constraints you must validate.
2. **Honor every established stage**
   - Alignment + capture behave identically, but your answers must be framed through the review template (UX intent, GOAL/SUBGOAL/TASK nesting, at least 10 sentences describing the “UX now vs. before”, explicit validation steps, emoji-tagged intent confirmations, and any new user stories that spill out).
   - Run `bin/spec check "<feature>"` to resolve open review questions (e.g., “Is subgoal B actually complete?”). Use `spec prompt check_continue` to remind yourself to keep momentum after logging clarifications.
   - During implementation validation, keep using `bin/spec progress`/`milestone` so every review insight lands inside the snapshot for downstream agents.
3. **Review step on completion**
   - After `spec close`, *immediately* paste the filled review template (generated from `review_capture.txt`) into your final status. State whether requirements from the initial task assignment were honored, list the validation steps (“Go to localhost:3000/admin…”) and provide at least 10 sentences explaining the UX delta.
   - Log the review into the spec snapshot by piping the same answers through `spec review -a "<feature>"`. The JSON payload must include the `command_reviews` array plus the four-metric checklist (alignment score, incomplete work, principle audit, error/assumption callouts) so the UI can show the accomplishment as a completed state.
   - Explicitly answer the four checklist questions (alignment score 1–10, incomplete work, code principle violations—cite `swarm -v "patterns" -c --limit 100`, and any errors/assumptions).
   - Use emoji to mark each intent statement (e.g., ✅ fully satisfies, ⚠️ partial, ❌ missing) so reviewers can skim quickly.

Documenting review specs this way “honors the pattern” by:
- Reusing the same capture/check/progress/close automation, so no manual drift.
- Adding exactly one new artifact—the review template—that the CLI can surface via `spec prompt review_capture`.
- Guaranteeing every spec flow now ends with an explicit review step, giving downstream agents instructions on how to verify UX, note requirements, and acknowledge new user stories.

### Pattern Honor Checklist
Use this checklist whenever you introduce a new workflow aspect (like the review spec) so you respect every existing automation hook:

1. **Spec capture parity** – Confirm the new workflow uses `bin/spec capture` (or a wrapper) so intent, context, and constraints land in `snapshots/` with the same schema. If the variation has a custom prompt, document it under `~/.codex/extensions/spec-tool/prompts/` and reference it from the README (just like `review_capture`).
2. **Clarification continuity** – Always run `bin/spec check` at least once before touching code so the `clarifications/` log records which open questions were resolved, deferred, or escalated for the new pattern.
3. **Milestone + progress logging** – Do not invent ad-hoc status formats. Route every UX update through `bin/spec milestone` or `bin/spec progress` so nested GOAL → SUBGOAL → TASK narratives, emoji intent states, and validation steps flow into `progress_updates`.
4. **Artifact parity** – If the new workflow adds docs, run `bin/spec artifact` so downstream agents see repo-relative paths automatically in the snapshot payloads.
5. **Close + review chain** – Require `bin/spec close` *and* a dedicated review prompt (e.g., `review_capture`) before a task is declared complete. This ensures the automated close-out report plus the UX-intent audit ship together, satisfying the “spec review → spec completion” loop the user mandated.

When you can check all five boxes, you have honored the established pattern while extending the workflow.

## Context-Surfacing Evaluation (2025-02-09)

The original intent of Spec Dev is to surface the right context at the exact moment an agent needs to act—*without* forcing them to re-read this README. Each atomic phase must therefore have (1) a single prompt file containing the context, (2) automatic emission of that prompt when the phase runs, and (3) deterministic “if X then Y” guidance so agents know when to advance or stop. The audit below tracks every violation and the paired remediation steps.

| Stage | Requirement vs. Intent | Violation Observed | Remediation | Status |
| --- | --- | --- | --- | --- |
| Complexity Gate (before capture) | Agent must know whether the task justifies the full spec workflow and, if so, how to break it into nested goals. | Complexity lived as prose in the README; the CLI never surfaced branching rules, so agents ran full specs for “change that color to black.” | Added `complexity_gate.txt`, wired it into `capture_pre`, and required a `complexity_level` field in every capture. The CLI now prints the branch-specific next steps (simple vs. structured vs. critical) immediately after capture. | ✅ |
| Next-step Guidance (post-capture) | The workflow should state the next command (“if you logged Structured, run `spec check` next…”) inside the command output. | Agents had to remember the sequence or reference README tables after capture. | `spec capture` now emits a “Next Steps” block derived from `complexity_level`, eliminating the need to consult external docs. | ✅ |
| Review Logging Reminder (close-out) | Agents must be told—in the moment—that a review spec needs to be logged via `spec review -a <feature>` before sending the final status. | Only the README mentioned this, so reviewers depended on tribal knowledge. | Updated `close_status.txt` to require the review log callout and evidence summary right after `spec close`. | ✅ |

Any future deviation from these context rules must include the same table: requirement, reasoning, and the concrete fix that injects instructions into the relevant prompt.

### Automation / Non-Interactive Runs
When Codex agents or CI systems cannot provide interactive input, set `SPEC_CLI_INPUT_JSON=/path/to/answers.json` before invoking any command. The CLI will prefill every prompt (alignment quote, stories, clarifications, close-out statuses, etc.) from that file while preserving the same validations and artifacts.

Example capture run:
```
SPEC_CLI_INPUT_JSON=spec-data/spec-flow-console.json SPEC_CLI_AUTO_ACK=1 bin/spec capture "spec-flow-console-dual-release"
```
Example check/close runs (reuse the same JSON or provide new ones):
```
SPEC_CLI_INPUT_JSON=spec-data/spec-flow-console.json SPEC_CLI_AUTO_ACK=1 bin/spec check "spec-flow-console-dual-release"
SPEC_CLI_INPUT_JSON=spec-data/spec-flow-console.json SPEC_CLI_AUTO_ACK=1 bin/spec close "spec-flow-console-dual-release"
```

JSON structure highlights:
- `alignment.quote`, `.summary`, `.gap`, `.constraints[]`, `.requirements[]`
- `complexity_level` – one of `simple`, `structured`, `critical`; drives which prompts fire after capture
- `repo`, `paths[]`, `intent`, `context`, `complexity_assessment`, `user_stories[]`, `acceptance_criteria[]`, `non_functional_requirements[]`, `deliverables[]`, `dependencies[]`, `sequence[]`, `validation[]`, `future_proofing[]`, `open_questions[]`, `swarm_tags`, `meta_summary`
- `clarifications.decisions[]` with `{ "choice": "r|d|e", "note": "..." }`
- `close.criteria_status[]`, `close.constraint_notes[]`, `close.ready`, `close.followups`

If `SPEC_CLI_INPUT_JSON` is unset the CLI behaves exactly as before, prompting interactively.

## Next Iterations

- Add `plan` and `swarm` commands mirroring Spec Kit’s implementation plans and swarm orchestration.
- Wire the best steps into MCP tools (`spec-capture`, `spec-check`, etc.) once this flow proves useful.
- Expand templates under `prompts/` so each command prints your canonical step-by-step instructions.
