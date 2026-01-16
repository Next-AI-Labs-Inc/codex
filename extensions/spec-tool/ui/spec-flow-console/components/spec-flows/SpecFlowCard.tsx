"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Layers2,
  ListChecks,
  Share2,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { SpecFlow } from "@/lib/specFlows";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SpecFlowCardProps = {
  spec: SpecFlow;
};

const relativeTime = (value?: string) => {
  if (!value) return undefined;
  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
  } catch {
    return value;
  }
};

const PROMPT_STATUS_META = [
  { key: "swarmInit", label: "Swarm", hint: "Capture prompt confirmed Swarm init." },
  {
    key: "statusInitial",
    label: "Status · Capture",
    hint: "Initial status prompt displayed after capture.",
  },
  {
    key: "keepShipping",
    label: "Keep Shipping",
    hint: "Clarify stage reminder to keep moving was shown.",
  },
  {
    key: "statusFinal",
    label: "Status · Close",
    hint: "Final status prompt displayed during close-out.",
  },
] as const;

const stageOrder = ["capture", "clarify", "progress", "artifacts", "review", "close"] as const;

export function SpecFlowCard({ spec }: SpecFlowCardProps) {
  const [open, setOpen] = useState(false);
  const [openStage, setOpenStage] = useState<typeof stageOrder[number] | null>(
    null
  );

  const capturedAgo = useMemo(() => {
    const relative = relativeTime(spec.capturedAt);
    if (!relative) return "Captured date unknown";
    return `Captured ${relative}`;
  }, [spec.capturedAt]);

  const outstandingLabel =
    spec.clarifications.outstanding > 0
      ? `${spec.clarifications.outstanding} open`
      : "All answered";

  const promptStatuses = PROMPT_STATUS_META.map((meta) => ({
    ...meta,
    active: spec.promptLog.status[meta.key],
  }));

  const artifactButtons = [
    { type: "snapshot", label: "Snapshot JSON", icon: Layers2 },
    { type: "clarifications", label: "Clarifications Log", icon: ClipboardList },
    { type: "promptLog", label: "Prompt Log", icon: ListChecks },
    { type: "report", label: "Close Report", icon: FileText },
  ] as const;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 shadow-lg shadow-slate-900/40">
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-indigo-500/20 p-2 text-indigo-300">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{spec.feature}</p>
              {spec.metaSummary && (
                <p className="text-sm text-slate-400">{spec.metaSummary}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {spec.repo.map((repo) => (
              <Badge
                key={repo}
                variant="outline"
                className="border-slate-700 bg-slate-900/60 text-slate-200"
              >
                repo: {repo}
              </Badge>
            ))}
            {spec.paths.slice(0, 3).map((path) => (
              <Badge
                key={path}
                className="border-slate-800 bg-slate-900/60 text-slate-200"
              >
                {path}
              </Badge>
            ))}
            {spec.paths.length > 3 && (
              <span>+{spec.paths.length - 3} files</span>
            )}
            <span className="ml-auto">{capturedAgo}</span>
          </div>
        </div>
        <div className="text-slate-400">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-5 py-4 text-slate-100">
          <PromptStatusBar statuses={promptStatuses} />

          <div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
            {spec.swarmTags && (
              <InlineLabel icon={Tags} label="Swarm tags">
                {spec.swarmTags}
              </InlineLabel>
            )}
            <InlineLabel icon={AlertTriangle} label="Clarifications">
              {outstandingLabel}
            </InlineLabel>
          </div>

          <div className="mt-6 space-y-4">
            {stageOrder.map((stage) => (
              <StageSection
                key={stage}
                stage={stage}
                spec={spec}
                isOpen={openStage === stage}
                onToggle={() =>
                  setOpenStage((current) => (current === stage ? null : stage))
                }
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {artifactButtons.map(({ type, label, icon: Icon }) => {
              const artifactPath = spec.artifacts[type];
              const href = `/api/spec-flows/${encodeURIComponent(
                spec.slug
              )}/artifact?type=${type}`;
              const disabled = !artifactPath;

              return (
                <a
                  key={type}
                  href={disabled ? undefined : href}
                  aria-disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                    disabled
                      ? "cursor-not-allowed border-slate-800 text-slate-600"
                      : "border-slate-600 bg-slate-900/60 text-slate-100 hover:border-indigo-400 hover:text-indigo-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <Download className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type StageSectionProps = {
  stage: typeof stageOrder[number];
  spec: SpecFlow;
  isOpen: boolean;
  onToggle: () => void;
};

const STAGE_CONFIG: Record<
  typeof stageOrder[number],
  { title: string; summary: string; icon: typeof Share2 }
> = {
  capture: {
    title: "Capture",
    summary: "Intent, user stories, requirements, deliverables.",
    icon: Layers2,
  },
  clarify: {
    title: "Clarify",
    summary: "Open questions and resolution log.",
    icon: ClipboardList,
  },
  progress: {
    title: "Progress",
    summary: "UX intent loops, validation steps, and emoji statuses.",
    icon: BadgeCheck,
  },
  artifacts: {
    title: "Artifacts",
    summary: "Docs, runbooks, and repo deliverables.",
    icon: FileText,
  },
  review: {
    title: "Review",
    summary: "Alignment evidence, concerns, and actionable tasks.",
    icon: ShieldCheck,
  },
  close: {
    title: "Close",
    summary: "Sequencing, validation, and future-proofing.",
    icon: ListChecks,
  },
};

function StageSection({ stage, spec, isOpen, onToggle }: StageSectionProps) {
  const stageMeta = STAGE_CONFIG[stage];
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40">
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={onToggle}
      >
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <stageMeta.icon className="h-4 w-4 text-indigo-300" />
            {stageMeta.title}
          </div>
          <p className="text-xs text-slate-400">{stageMeta.summary}</p>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-slate-800 px-5 py-6 text-sm text-slate-100">
          {stage === "capture" && <CaptureStage spec={spec} />}
          {stage === "clarify" && <ClarifyStage spec={spec} />}
          {stage === "progress" && <ProgressStage spec={spec} />}
          {stage === "artifacts" && <ArtifactsStage spec={spec} />}
          {stage === "review" && <ReviewStage spec={spec} />}
          {stage === "close" && <CloseStage spec={spec} />}
        </div>
      )}
    </div>
  );
}

function CaptureStage({ spec }: { spec: SpecFlow }) {
  return (
    <div className="space-y-6">
      <TextBlock label="Intent" value={spec.intent} />
      <TextBlock label="Context" value={spec.context} />
      <ListBlock label="User stories" items={spec.userStories} />
      <ListBlock label="Acceptance criteria" items={spec.acceptanceCriteria} />
      <ListBlock
        label="Non-functional requirements"
        items={spec.nonFunctionalRequirements}
      />
      <ListBlock label="Deliverables" items={spec.deliverables} />
      <ListBlock label="Dependencies" items={spec.dependencies} />
    </div>
  );
}

function ClarifyStage({ spec }: { spec: SpecFlow }) {
  return (
    <div className="space-y-6">
      <ListBlock label="Open questions" items={spec.openQuestions} />
      {spec.clarifications.entries.length === 0 ? (
        <p className="text-slate-400">No clarifications logged yet.</p>
      ) : (
        <div className="space-y-3">
          {spec.clarifications.entries.map((entry) => (
            <div
              key={entry.raw}
              className="rounded-md border border-slate-800 bg-slate-900/60 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2 text-slate-300">
                <BadgeCheck className="h-3 w-3 text-indigo-300" />
                <span className="font-semibold">{entry.status}</span>
                <span className="text-slate-500">{entry.timestamp}</span>
              </div>
              <p className="mt-2 font-medium text-slate-200">{entry.topic}</p>
              {entry.notes && (
                <p className="mt-1 text-slate-400">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressStage({ spec }: { spec: SpecFlow }) {
  const [openUpdate, setOpenUpdate] = useState<string | null>(
    spec.progressUpdates[0]?.id ?? null
  );

  if (!spec.progressUpdates.length) {
    return (
      <p className="text-slate-400">
        No progress updates logged yet. Run `spec progress &lt;feature&gt;` after each UX-impacting
        sub-step to populate this panel.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {spec.progressUpdates.map((update) => {
        const isOpen = openUpdate === update.id;
        return (
          <div
            key={update.id}
            className="rounded-lg border border-slate-800 bg-slate-900/60 text-sm text-slate-100"
          >
            <button
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
              onClick={() =>
                setOpenUpdate((current) => (current === update.id ? null : update.id))
              }
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  {update.overarchingIntent ?? "Progress update"}
                </p>
                <p className="text-xs text-slate-400">
                  {update.subgoalIntent ?? update.userQuote ?? "Subgoal intent"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {update.timestamp && (
                  <span>{relativeTime(update.timestamp) ?? update.timestamp}</span>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-slate-800 px-4 py-4 space-y-4">
                {update.subgoalIntent && (
                  <p className="text-slate-300">
                    <span className="font-semibold text-slate-200">Subgoal:</span>{" "}
                    {update.subgoalIntent}
                  </p>
                )}
                <TextBlock label="Intent laddering" value={update.intentConnection} />
                <TextBlock label="Technical nuance" value={update.technicalNuance} />
                <TextBlock label="UX now vs before" value={update.uxNow} />
                <ListBlock label="Completed sub-steps" items={update.tasksCompleted} />
                <ListBlock label="Intent statuses" items={update.intentStatuses} />
                <ListBlock label="New user stories" items={update.newUserStories} />
                {(update.validationEntry ||
                  update.validationSteps ||
                  update.validationNotice ||
                  update.validationRequirement) && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Validation</p>
                    <ul className="mt-2 space-y-1 text-slate-200">
                      {update.validationEntry && <li>Entry: {update.validationEntry}</li>}
                      {update.validationSteps && <li>Steps: {update.validationSteps}</li>}
                      {update.validationNotice && <li>Notice: {update.validationNotice}</li>}
                      {update.validationRequirement && (
                        <li>Requirement proof: {update.validationRequirement}</li>
                      )}
                    </ul>
                  </div>
                )}
                <TextBlock
                  label="Requirements honored"
                  value={update.requirementsNote}
                />
                {update.renderText && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Copy-ready status block
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-200">
                      {update.renderText}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ArtifactsStage({ spec }: { spec: SpecFlow }) {
  if (!spec.artifactLinks.length) {
    return (
      <p className="text-slate-400">
        No repo artifacts logged yet. Run `spec artifact &lt;feature&gt;` after you publish runbooks
        or docs so they appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {spec.artifactLinks.map((artifact) => (
        <div
          key={`${artifact.id}-${artifact.path}`}
          className="rounded-md border border-slate-800 bg-slate-900/60 p-3"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-slate-200">{artifact.path}</span>
            {artifact.status && (
              <Badge variant="outline" className="border-slate-700 bg-slate-950/40 text-slate-100">
                {artifact.status}
              </Badge>
            )}
            {artifact.addedAt && <span>Logged {relativeTime(artifact.addedAt)}</span>}
          </div>
          {artifact.summary && (
            <p className="mt-2 text-sm text-slate-100">{artifact.summary}</p>
          )}
          {artifact.intent && (
            <p className="mt-1 text-xs text-slate-400">Intent: {artifact.intent}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewStage({ spec }: { spec: SpecFlow }) {
  const latestReview = spec.alignmentReviews[0];
  return (
    <div className="space-y-6">
      <SectionHeading
        title="Alignment review"
        subtitle="Reasoning and evidence required before closing."
      />
      {latestReview ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <StatusChip status={latestReview.status ?? "for_review"} />
            <span className="font-semibold text-white">
              {latestReview.title ?? "Alignment review"}
            </span>
            {latestReview.createdAt && (
              <span>{relativeTime(latestReview.createdAt) ?? latestReview.createdAt}</span>
            )}
          </div>
          {latestReview.reasoning && (
            <p className="text-sm leading-relaxed text-slate-100">
              {latestReview.reasoning}
            </p>
          )}
          {latestReview.progressReference && (
            <p className="text-xs text-slate-400">
              Progress reference: {latestReview.progressReference}
            </p>
          )}
          {latestReview.evidence.length > 0 && (
            <ListBlock label="Evidence" items={latestReview.evidence} />
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          No alignment review recorded. Run `spec review -a &lt;feature&gt;` after validating each
          command to unblock close-out.
        </p>
      )}

      {spec.commandReviews.length > 0 && (
        <div className="space-y-3">
          <SectionHeading
            title="Command evidence"
            subtitle="Proof that each CLI stage matches the intended UX."
          />
          <div className="space-y-3">
            {spec.commandReviews.map((review) => (
              <div
                key={review.command}
                className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={review.status ?? "for_review"} />
                  <span className="text-sm font-semibold text-white">{review.command}</span>
                </div>
                {review.intent && (
                  <p className="text-sm text-slate-100">{review.intent}</p>
                )}
                {review.validation && (
                  <p className="text-xs text-slate-400">Validation: {review.validation}</p>
                )}
                {review.notes && (
                  <p className="text-xs text-slate-400">Notes: {review.notes}</p>
                )}
                {review.nextAction && (
                  <p className="text-xs text-slate-400">
                    Next action: {review.nextAction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {spec.uxConcerns.length > 0 && (
        <div className="space-y-3">
          <SectionHeading
            title="UX concerns"
            subtitle="High-level UX gaps framed as tasks."
          />
          <div className="space-y-3">
            {spec.uxConcerns.map((concern) => (
              <div
                key={`${concern.title}-${concern.status ?? "status"}`}
                className="rounded-lg border border-slate-800/80 bg-slate-950/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={concern.status ?? "actionable"} />
                  <span className="text-sm font-semibold text-white">{concern.title}</span>
                </div>
                {concern.notes && (
                  <p className="mt-1 text-xs text-slate-400">{concern.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {spec.actionItems.length > 0 && (
        <div className="space-y-3">
          <SectionHeading
            title="Action items"
            subtitle="Concrete follow-ups (CLI filters, CRUD, etc.)."
          />
          <div className="space-y-3">
            {spec.actionItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-800/80 bg-slate-950/20 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={item.status ?? "actionable"} />
                  <span className="text-sm font-semibold text-white">{item.title}</span>
                </div>
                {item.notes && (
                  <p className="mt-1 text-xs text-slate-400">{item.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CloseStage({ spec }: { spec: SpecFlow }) {
  return (
    <div className="space-y-6">
      <ListBlock label="Sequence" items={spec.sequence} />
      <ListBlock label="Validation" items={spec.validation} />
      <ListBlock label="Future-proofing" items={spec.futureProofing} />
      <TextBlock label="Meta summary" value={spec.metaSummary} />
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-slate-100">{value}</p>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <ul className="mt-2 space-y-2 text-sm text-slate-100">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md border border-slate-800/80 bg-slate-900/60 px-3 py-2"
          >
            {(() => {
              const parsed = parseStatusToken(item);
              if (!parsed) return item;
              return (
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={parsed.status} />
                  <span>{parsed.text}</span>
                </div>
              );
            })()}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_META: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  actionable: { label: "Actionable", className: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
  done: { label: "Done", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" },
  shipped: { label: "Shipped", className: "border-sky-500/40 bg-sky-500/10 text-sky-200" },
  for_review: { label: "For review", className: "border-indigo-400/40 bg-indigo-500/10 text-indigo-200" },
  proposed: { label: "Proposed", className: "border-slate-500/40 bg-slate-500/10 text-slate-200" },
  blocked: { label: "Blocked", className: "border-red-500/40 bg-red-500/10 text-red-200" },
  default: { label: "Status", className: "border-slate-500/40 bg-slate-500/10 text-slate-200" },
};

function StatusChip({ status }: { status: string }) {
  const normalized = status?.toLowerCase().replace(/\s+/g, "_");
  const meta = STATUS_META[normalized] ?? { ...STATUS_META.default, label: status };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

function parseStatusToken(value: string) {
  const match = value.match(/^\s*\[([^\]]+)]\s*(.*)$/);
  if (!match) return null;
  const status = match[1].trim();
  const text = match[2]?.trim() || value;
  return { status, text };
}

function InlineLabel({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Tags;
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-white">
      <Icon className="h-4 w-4 text-indigo-300" />
      <span className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-sm text-slate-100">{children}</span>
    </span>
  );
}

function PromptStatusBar({
  statuses,
}: {
  statuses: { key: string; label: string; hint: string; active: boolean }[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {statuses.map((status) => (
        <div
          key={status.key}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
            status.active
              ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
              : "border-slate-800 bg-slate-900/40 text-slate-500"
          )}
        >
          <span>{status.label}</span>
          {status.active ? (
            <BadgeCheck className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
        </div>
      ))}
    </div>
  );
}
