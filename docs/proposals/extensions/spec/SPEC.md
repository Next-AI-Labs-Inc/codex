# Extension Spec Proposal: `-spec` (Integrated Spec + Task + Memory Workspace)

## Intent
Collapse the current multi-step Spec Dev workflow into **one Codex lifecycle** by providing an integrated workspace UI where:
- specs are captured/updated automatically,
- task lists are visible without asking the agent,
- memory retrieval and curation are first-class,
- and everything stays collapsed/nested until expanded.

## Context
- The current spec tool protocol is valuable but expensive because it requires repeated terminal-driven lifecycles.
- The biggest efficiency gap is lack of a structured UI for conversation, tasks, spec artifacts, and memory curation.

## Target UX (User Journey)
1. User opens the `/` menu and selects **View Extensions**.
2. They see validated extensions including `-spec`.
3. They run a Codex command with `-spec`.
4. Codex detects the extension isn’t initialized, lazily installs/starts it, and prints the local URL.
5. User opens the URL and sees a single nested workspace:
   - conversation timeline,
   - spec (intent, requirements, validations),
   - task list (live),
   - memory search inputs + injected memories,
   - proposed memories awaiting approval (edit/approve/reject).

## Functional Requirements
1. **Flag activation**
   - `codex … -spec` enables the integrated workspace for that run.
2. **Lazy install / start**
   - If the UI/service isn’t running, start it and print the URL.
   - If already running, reuse.
3. **Task list ownership**
   - The agent’s internal task list is persisted and rendered in the UI (no need to ask).
4. **Spec capture**
   - In the same lifecycle, capture the “finished-state” spec sections (intent/context/stories/requirements/validation/etc.) without forcing 8 separate manual prompts.
5. **Memory integration**
   - The existing memory console becomes the primary UI:
     - shows Swarm (primary) + AgentDB (secondary),
     - shows “proposed” memories for approve/edit,
     - shows “injected memories” per turn for auditing.
6. **`-debug`**
   - Print lifecycle events: extension init, URL, spec write targets, task list updates, memory sources attached.

## Non-Functional Requirements
1. **No regression without flags**
   - When `-spec` is not used, Codex behaves identically and does not start background services.
2. **Data segregation**
   - Any internal company data (memories, transcripts, proposed logs) must live in private folders and be `.gitignore`’d.
   - The UI must clearly label which stores are safe-to-commit vs private.
3. **Atomic PR discipline**
   - Ship in slices: `/extensions` menu → `-spec` lazy-start → task list persistence → spec persistence → memory curation UI.

## Deliverables
- `/` menu entry: “View Extensions” with concise help.
- `-spec` flag that starts/reuses the Spec workspace and prints URL.
- UI rendering: task list + spec + memory curation (nested).
- Persistence layer for task list and spec artifacts.
- Tests for “no-op when off” and “start + URL when on.”

## Sequence / Milestones
1. Extensions registry + `/extensions` UI panel.
2. `-spec` flag triggers lazy start + URL.
3. Persist task list; render in UI.
4. Persist spec sections; render + update in UI.
5. Embed memory curation UI (approve/edit/reject proposed → primary).
6. Add `-debug` instrumentation + tests.

## Implementation Plan (Execution Checklist)
- [ ] Locate Codex CLI flag parsing + slash command handling to wire `-spec` and `/extensions`.
- [ ] Add an extensions registry (enum + metadata) with lazy activation guarantees.
- [ ] Implement `/extensions` slash command UI output listing available extensions + their flags.
- [ ] Add `--spec` flag to CLI; when enabled, lazy-start spec UI and attach conversation.
- [ ] Define strict data boundary: use spec-tool UI code only; store all user specs under private, gitignored paths.
- [ ] Wire spec UI launch + deep-link to the correct page on activation.
- [ ] Connect “spec capture” + task list updates to a single-lifecycle stream (no terminal steps).
- [ ] Add `--spec-debug` (or `-spec --debug`) verbose logs for activation, paths, and UI URL.
- [ ] Add tests: “no-op when off”, “start UI + URL when on”, “does not touch internal spec stores”.

## Validation & Success Criteria
- A user can enable `-spec`, open the URL, and see tasks/spec/memory in one nested workspace.
- The task list updates as work progresses without extra prompts.
- Proposed memories appear and can be promoted to primary.

## Future-Proofing
- Support “agentarmy” results as a first-class panel in this workspace.
- Add per-task validation checklists and evidence attachments.

## Open Questions
- Which persistence format is best for task list/spec (JSON snapshots vs sqlite)?
- Should the workspace be a separate process or embedded TUI panel?

## Meta Summary
`-spec` turns the spec protocol into a first-class, single-lifecycle workspace that replaces expensive repeated terminal steps with persistent, nested UI artifacts.
