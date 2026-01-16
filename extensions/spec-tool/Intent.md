• Spec CLI Entry: Routes Every Spec Action Through One Door  
  Whenever an agent touches a spec—whether they’re capturing, clarifying, or closing—they launch this CLI first so the correct interview, logging, and output steps trigger in order. A top-level wrapper (`bin/spec`) points here so agents can run one universal command.  
  `extensions/spec-tool/spec-cli.sh`

• Alignment + Capture Prompts: Lock Scope Before Specs Start  
  Alignment comes first: the agent quotes the user verbatim, states intent/target/gap/constraints/requirements, and commits to the Confirm Command rules. Immediately afterward, the capture prompt gathers the full spec (intent, context, complexity assessment, stories, requirements, etc.) without inventing scope, and the `capture_swarm` reminder ensures `swarm` has been run.  
  `extensions/spec-tool/prompts/alignment_command.txt`  
  `extensions/spec-tool/prompts/capture.txt`  
  `extensions/spec-tool/prompts/capture_swarm.txt`

• Capture Helper: Records the Narrative as Structured Data  
  As the agent responds, this helper enforces all the rules (10-sentence intent, meta summary, open questions) and converts the entire capture session into a spec snapshot everyone else can read.  
  `extensions/spec-tool/lib/spec-cli-capture.sh`

• Spec Snapshot: Canonical Story Before Code Begins  
  Once capture ends, this JSON file holds the full narrative—intent through future-proofing—plus the repo name and exact file paths that will change, so anyone reviewing the task sees precisely what surface area the work covers before implementation.  
  `~/.codex/extensions/spec-tool/snapshots/<feature>.json`

• Clarify Prompt: Makes Agents Resolve Ambiguity Up Front  
  Right before implementation, the agent revisits every open question using this script, deciding whether each item is resolved, deferred, or escalated so ambiguity never quietly leaks into the codebase.  
  `extensions/spec-tool/prompts/check.txt`

• Clarify Helper: Logs Each Resolution Decision with Context  
  This helper reads the snapshot’s open questions, forces the agent to log their decision and notes, and ensures there’s a record of how uncertainty was handled before changes land.  
  `extensions/spec-tool/lib/spec-cli-check.sh`

• Clarification Log: Timestamped Trail of Every Decision  
  Each resolve/defer/escalate outcome from the clarification step is appended here, giving reviewers a timeline of how questions were answered or intentionally deferred before implementation.  
  `~/.codex/extensions/spec-tool/clarifications/<feature>.log`

• Close-Out Prompt: Replays the Spec to Prove Completion  
  When work is done, the agent walks through this checklist to restate every acceptance criterion and constraint, declare pass/fail with evidence, and note follow-ups so reviewers see exactly what shipped. A follow-up prompt (`close_status.txt`) reminds them to send the final status report referencing the close-out artifact.  
  `extensions/spec-tool/prompts/close.txt`  
  `extensions/spec-tool/prompts/close_status.txt`

• Prompt Logs: Audit Trail for Every Stage  
  Each time the CLI displays a stage prompt (swarm reminder, initial status check, continue-after-clarifications, final status check) it records the event for that feature so reviewers can verify compliance.  
  `~/.codex/extensions/spec-tool/logs/<feature>.log`

• Stage Hooks Configuration: Plug-and-Play Prompt Mapping  
  Declares which prompts fire before/after capture, check, and close so we can add or reorder prompts without editing code.  
  `extensions/spec-tool/config/stage-hooks.json`

• Close-Out Helper: Builds the Final Reviewer-Friendly Summary  
  This helper pulls the original spec details, captures the agent’s pass/fail responses, and shapes them into the close-out report reviewers rely on for approval.  
  `extensions/spec-tool/lib/spec-cli-close.sh`

• Close-Out Report: Final Artifact Reviewers Read for Approval  
  The completed close-out summary lives here, mapping each requirement to its outcome and making the acceptance decision straightforward for whoever signs off.  
  `~/.codex/extensions/spec-tool/reports/<feature>.md`

• Confirm and Completion Prompts: Manual Commands for Scope Alignment and Handoff  
  Agents can run `bin/spec confirm "<scope>"` to restate the user’s request using `confirm_command.txt`, and `bin/spec completion` to generate the Task Completion Module defined in `prompts/completion.txt` for every finished milestone/subtask.  
  `extensions/spec-tool/prompts/confirm_command.txt`  
  `extensions/spec-tool/prompts/completion.txt`

• Milestone Prompt: UX Progress Narratives Mid-Task  
  When a substantive milestone is hit, agents run `bin/spec milestone`, which loads `prompts/milestone_report.txt`, injects the stored user quote, and produces the required 10-sentence UX report plus verification steps.  
  `extensions/spec-tool/prompts/milestone_report.txt`
