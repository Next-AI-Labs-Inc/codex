const heroCopy = `Rapidly the cost of AI compute is dropping, allowing for much more robust ai agent self reflection.  When guided with explicit intentionality, we believe that this additional compute resource can accelerate development workflows to 200% or greater wins in the very near future. 

This work is an exploration on that, providing a living interface for human <> ai collaboration, it operates as a drop in replacement for the web codex tooling, when coupled with agents in the terminal and the agent swarm system for creating hive style memory for agentic coders.  

The object is capturing immediate increases in agentic intent alignment with humans.  

Alignment.  Once a concern for those devoted to the welfare of humanity... 

Now, an essential prereq for effective development. 

Incentives.  Aligned. `;

const flowCards = [
  {
    title: "Capture",
    badge: "JSON snapshots",
    description:
      "Every spec capture writes structured state into ~/.codex/extensions/spec-tool so teams see origin intent, repo paths, and alignment quotes without context switching.",
    snippet: `{
  "feature": "Swarm Workflow Navigation",
  "paths": ["app/layout.tsx", "..."],
  "intent": "Rebrand console with nav + about"
}`,
  },
  {
    title: "Clarify",
    badge: "Clarification logs",
    description:
      "Clarifications flow into rolling logs so the About storylines stay tethered to active questions, decisions, and deferred risks.",
    snippet: `2025-02-10T21:04Z | Needs Clarification
• Graphic placeholder until asset ships
• Future nav slots reserved`,
  },
  {
    title: "Close",
    badge: "Prompt trail",
    description:
      "Close-out prompts confirm acceptance criteria, constraints, and UX validations, giving auditors confidence before shipping.",
    snippet: `CLOSE REPORT
- Dashboard unchanged ✅
- About route verified ✅
- Metadata updated ✅`,
  },
];

const timeline = [
  {
    title: "Repo-first surface",
    detail:
      "Live inside the same monorepo as the agents so every inspection inherits the exact code + memory context.",
  },
  {
    title: "Reflexive agents",
    detail:
      "Spec Workflow snapshots feed the terminal agents, who in turn write new observations back into Swarm Workflow.",
  },
  {
    title: "Shared incentives",
    detail:
      "Alignment signals bubble up as UI affordances—admins can see incentives pulling in the same direction before shipping.",
  },
];

const intentSignals = [
  "Repo-native telemetry",
  "Agent swarm memory slots",
  "Human ↔ AI pairing rituals",
  "5s refresh focus loop",
  "Drop-in replacement for web codex",
];

export default function AboutPage() {
  return (
    <div className="bg-slate-950 text-white">
      <div className="container mx-auto space-y-20 px-4 py-10">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">
              About Swarm Workflow
            </p>
            <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-100">
              {heroCopy}
            </p>
            <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-inner shadow-indigo-500/20">
              <p className="text-sm text-slate-300">
                Swarm Workflow sits beside the agents themselves. It mirrors the
                capture → clarify → close lifecycle, letting humans witness
                every alignment move without leaving the repo.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {intentSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs uppercase tracking-wide text-slate-300"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-indigo-400/60 bg-gradient-to-b from-slate-900/60 to-slate-950 p-6 text-center shadow-2xl shadow-indigo-500/30">
            <div className="flex h-full flex-col items-center justify-center space-y-4">
              <p className="text-sm uppercase tracking-[0.35em] text-indigo-300">
                Hero Graphic Slot
              </p>
              <p className="text-slate-300">
                Placeholder reserved for the forthcoming illustration. Drop the
                asset in once provided—layout already honors its aspect ratio.
              </p>
              <p className="text-xs text-slate-500">
                (No generated art here. Real asset goes live when supplied.)
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">
                Living workflow
              </p>
              <h2 className="text-3xl font-semibold">Capture → Clarify → Close</h2>
            </div>
            <p className="text-sm text-slate-400">
              Hover or expand each stage to inspect how data flows through the
              console.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {flowCards.map((card) => (
              <details
                key={card.title}
                className="group rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur transition hover:-translate-y-1 hover:border-indigo-500/60"
                open
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">
                      {card.badge}
                    </p>
                    <p className="text-2xl font-semibold">{card.title}</p>
                  </div>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300 transition group-open:bg-indigo-500 group-open:text-white">
                    View
                  </span>
                </summary>
                <div className="space-y-4 px-6 pb-6 text-sm text-slate-300">
                  <p>{card.description}</p>
                  <pre className="rounded-2xl border border-white/5 bg-black/40 p-4 text-xs text-slate-200">
                    {card.snippet}
                  </pre>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-8">
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">
              Operating timeline
            </p>
            <div className="space-y-6">
              {timeline.map((item, index) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-white/10 font-mono text-sm text-indigo-300">
                      {index + 1}
                    </span>
                    {index < timeline.length - 1 && (
                      <span className="mt-1 h-16 w-px bg-white/10" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-300">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8">
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-300">
              Drop-in replacement
            </p>
            <h3 className="text-2xl font-semibold">
              Works wherever the agents ship
            </h3>
            <p className="text-sm text-slate-300">
              Swarm Workflow is designed as a drop-in replacement for web codex
              tooling. Pair it with terminal agents and the agent swarm memory
              system to keep incentives aligned between humans and AI.
            </p>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-slate-200">
              <p>// repo hooks</p>
              <p>pnpm dev --filter spec-flow-console</p>
              <p>tail -f ~/.codex/extensions/spec-tool/logs/*.log</p>
              <p>// swarm agents update memories in lockstep</p>
            </div>
            <p className="text-sm text-slate-400">
              Need to extend it? Add routes beside <code>/about</code> and wire
              them into the nav without rewriting the shell.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-indigo-500/30 bg-indigo-500/10 p-8 text-center shadow-[0_0_45px_rgba(99,102,241,0.25)]">
          <p className="text-sm uppercase tracking-[0.4em] text-indigo-200">
            Intent alignment objective
          </p>
          <h3 className="mt-4 text-3xl font-semibold">
            Capture immediate increases in agentic intent alignment with humans
          </h3>
          <p className="mt-4 text-sm text-slate-200">
            Keep the dashboard tab focused to stream updates every 5 seconds,
            or drop into terminal agents to write the next lesson into the hive
            memory.
          </p>
        </section>
      </div>
    </div>
  );
}
