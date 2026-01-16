import fs from "fs/promises";
import os from "os";
import path from "path";

const SPEC_TOOL_HOME =
  process.env.CODEX_SPEC_TOOL_HOME ??
  path.join(os.homedir(), ".codex", "extensions", "spec-tool");
const SNAPSHOT_DIR = path.join(SPEC_TOOL_HOME, "snapshots");
const CLARIFICATION_DIR = path.join(SPEC_TOOL_HOME, "clarifications");
const PROMPT_LOG_DIR = path.join(SPEC_TOOL_HOME, "logs");
const REPORT_DIR = path.join(SPEC_TOOL_HOME, "reports");

const CLARIFICATION_STATUS_LABEL: Record<string, string> = {
  r: "Resolved",
  d: "Deferred",
  e: "Escalated",
};

export type ClarificationEntry = {
  timestamp: string;
  code: string;
  status: string;
  topic: string;
  notes: string;
  raw: string;
};

export type PromptLogEntry = {
  timestamp: string;
  event: string;
  detail: string;
  raw: string;
};

export type SpecArtifactKind =
  | "snapshot"
  | "clarifications"
  | "promptLog"
  | "report";

type SnapshotJson = {
  feature?: unknown;
  task_id?: unknown;
  repo?: unknown;
  paths?: unknown;
  captured_at?: unknown;
  intent?: unknown;
  context?: unknown;
  meta_summary?: unknown;
  swarm_tags?: unknown;
  user_stories?: unknown;
  acceptance_criteria?: unknown;
  non_functional_requirements?: unknown;
  deliverables?: unknown;
  dependencies?: unknown;
  sequence?: unknown;
  validation?: unknown;
  future_proofing?: unknown;
  open_questions?: unknown;
  artifact_links?: unknown;
  progress_updates?: unknown;
  [key: string]: unknown;
};

export type ArtifactLink = {
  id: string;
  path: string;
  summary?: string;
  status?: string;
  intent?: string;
  addedAt?: string;
};

export type ProgressUpdate = {
  id: string;
  timestamp?: string;
  userQuote?: string;
  overarchingIntent?: string;
  subgoalIntent?: string;
  intentConnection?: string;
  technicalNuance?: string;
  uxNow?: string;
  validationEntry?: string;
  validationSteps?: string;
  validationNotice?: string;
  validationRequirement?: string;
  requirementsNote?: string;
  tasksCompleted: string[];
  intentStatuses: string[];
  newUserStories: string[];
  renderText?: string;
};

export type CommandReview = {
  command: string;
  intent?: string;
  validation?: string;
  status?: string;
  notes?: string;
  nextAction?: string;
};

export type UXConcern = {
  title: string;
  status?: string;
  notes?: string;
};

export type ActionItem = {
  id: string;
  title: string;
  status?: string;
  notes?: string;
};

export type AlignmentReview = {
  id: string;
  title?: string;
  status?: string;
  reasoning?: string;
  progressReference?: string;
  createdAt?: string;
  evidence: string[];
};

export type SpecFlow = {
  slug: string;
  feature: string;
  taskId?: string;
  repo: string[];
  paths: string[];
  capturedAt?: string;
  intent?: string;
  context?: string;
  metaSummary?: string;
  swarmTags?: string;
  userStories: string[];
  acceptanceCriteria: string[];
  nonFunctionalRequirements: string[];
  deliverables: string[];
  dependencies: string[];
  sequence: string[];
  validation: string[];
  futureProofing: string[];
  openQuestions: string[];
  artifactLinks: ArtifactLink[];
  progressUpdates: ProgressUpdate[];
  commandReviews: CommandReview[];
  uxConcerns: UXConcern[];
  actionItems: ActionItem[];
  alignmentReviews: AlignmentReview[];
  promptLog: {
    entries: PromptLogEntry[];
    status: {
      swarmInit: boolean;
      statusInitial: boolean;
      keepShipping: boolean;
      statusFinal: boolean;
    };
  };
  clarifications: {
    entries: ClarificationEntry[];
    outstanding: number;
  };
  artifacts: {
    snapshot: string | null;
    clarifications: string | null;
    promptLog: string | null;
    report: string | null;
  };
};

const ensureArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => {
          if (typeof entry === "string") return entry.trim();
          return null;
        })
        .filter((entry): entry is string => Boolean(entry))
    : [];

const ensureString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const pathExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const parseClarificationLog = (content: string): ClarificationEntry[] =>
  content
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const [timestamp = "", code = "", topic = "", notes = ""] = parts;
      const status = CLARIFICATION_STATUS_LABEL[code.toLowerCase()] ?? "Open";
      return {
        timestamp,
        code,
        status,
        topic,
        notes,
        raw: line,
      };
    });

const parsePromptLog = (content: string): PromptLogEntry[] =>
  content
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const [timestamp = "", event = "", detail = ""] = parts;
      return {
        timestamp,
        event,
        detail,
        raw: line,
      };
    });

const derivePromptStatus = (entries: PromptLogEntry[]) => {
  const hasEvent = (match: string | RegExp) =>
    entries.some((entry) =>
      typeof match === "string"
        ? entry.event.toLowerCase().includes(match.toLowerCase())
        : match.test(entry.event)
    );

  return {
    swarmInit: hasEvent(/capture[_-]?swarm/i),
    statusInitial: hasEvent(/status[_-]?prompt[_-]?initial|status[_-]?initial/i),
    keepShipping: hasEvent(/keep[_-]?shipping/i),
    statusFinal: hasEvent(/status[_-]?final|close[_-]?status/i),
  };
};

const relativePath = (absolute: string | null) =>
  absolute ? path.relative(SPEC_TOOL_HOME, absolute) : null;

async function loadSnapshot(file: string): Promise<SnapshotJson | null> {
  try {
    const content = await fs.readFile(file, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`[spec-flows] Failed to parse snapshot ${file}:`, error);
    return null;
  }
}

async function readTextFile(filePath: string | null) {
  if (!filePath || !(await pathExists(filePath))) return null;
  return fs.readFile(filePath, "utf8");
}

function slugFromFilename(file: string) {
  return path.basename(file).replace(/\.json$/i, "");
}

export async function getSpecFlows(): Promise<SpecFlow[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(SNAPSHOT_DIR);
  } catch (error) {
    console.error("[spec-flows] Unable to read snapshots directory:", error);
    return [];
  }

  const candidates = files.filter((file) => file.endsWith(".json"));
  const flows: SpecFlow[] = [];

  for (const filename of candidates) {
    const absolute = path.join(SNAPSHOT_DIR, filename);
    const snapshot = await loadSnapshot(absolute);
    if (!snapshot) continue;

    const slug = slugFromFilename(filename);
    const feature = ensureString(snapshot.feature) ?? slug;
    const repoRaw = snapshot.repo;
    const repo =
      typeof repoRaw === "string"
        ? [repoRaw]
        : ensureArray(repoRaw).length
        ? ensureArray(repoRaw)
        : [];

    const paths = ensureArray(snapshot.paths);
    const openQuestions = ensureArray(snapshot.open_questions);
    const artifactLinks = parseArtifactLinks(snapshot.artifact_links);
    const progressUpdates = parseProgressUpdates(snapshot.progress_updates);
    const commandReviews = parseCommandReviews(snapshot.command_reviews);
    const uxConcerns = parseConcerns(snapshot.ux_concerns);
    const actionItems = parseActionItems(snapshot.action_items);
    const alignmentReviews = parseAlignmentReviews(snapshot.alignment_reviews);

    const clarificationsPath = path.join(CLARIFICATION_DIR, `${slug}.log`);
    const promptLogPath = path.join(PROMPT_LOG_DIR, `${slug}.log`);
    const reportPath = path.join(REPORT_DIR, `${slug}.md`);

    const clarificationContent = await readTextFile(clarificationsPath);
    const promptLogContent = await readTextFile(promptLogPath);

    const clarificationEntries = clarificationContent
      ? parseClarificationLog(clarificationContent)
      : [];
    const promptLogEntries = promptLogContent
      ? parsePromptLog(promptLogContent)
      : [];

    const promptStatus = derivePromptStatus(promptLogEntries);
    const outstandingClarifications = clarificationEntries.filter(
      (entry) => entry.status !== "Resolved"
    ).length;

    flows.push({
      slug,
      feature,
      taskId: ensureString(snapshot.task_id),
      repo,
      paths,
      capturedAt: ensureString(snapshot.captured_at),
      intent: ensureString(snapshot.intent),
      context: ensureString(snapshot.context),
      metaSummary: ensureString(snapshot.meta_summary),
      swarmTags: ensureString(snapshot.swarm_tags),
      userStories: ensureArray(snapshot.user_stories),
      acceptanceCriteria: ensureArray(snapshot.acceptance_criteria),
      nonFunctionalRequirements: ensureArray(snapshot.non_functional_requirements),
      deliverables: ensureArray(snapshot.deliverables),
      dependencies: ensureArray(snapshot.dependencies),
      sequence: ensureArray(snapshot.sequence),
      validation: ensureArray(snapshot.validation),
      futureProofing: ensureArray(snapshot.future_proofing),
      openQuestions,
      artifactLinks,
      progressUpdates,
      commandReviews,
      uxConcerns,
      actionItems,
      alignmentReviews,
      promptLog: {
        entries: promptLogEntries,
        status: promptStatus,
      },
      clarifications: {
        entries: clarificationEntries,
        outstanding: outstandingClarifications,
      },
      artifacts: {
        snapshot: relativePath(absolute),
        clarifications: (await pathExists(clarificationsPath))
          ? relativePath(clarificationsPath)
          : null,
        promptLog: (await pathExists(promptLogPath))
          ? relativePath(promptLogPath)
          : null,
        report: (await pathExists(reportPath))
          ? relativePath(reportPath)
          : null,
      },
    });
  }

  return flows.sort((a, b) => {
    const timeA = a.capturedAt ? Date.parse(a.capturedAt) : 0;
    const timeB = b.capturedAt ? Date.parse(b.capturedAt) : 0;
    return timeB - timeA;
  });
}

type ArtifactInfo = {
  path: string;
  mime: string;
  downloadName: string;
};

const ARTIFACT_META: Record<SpecArtifactKind, { dir: string; ext: string; mime: string }> = {
  snapshot: { dir: SNAPSHOT_DIR, ext: ".json", mime: "application/json" },
  clarifications: { dir: CLARIFICATION_DIR, ext: ".log", mime: "text/plain" },
  promptLog: { dir: PROMPT_LOG_DIR, ext: ".log", mime: "text/plain" },
  report: { dir: REPORT_DIR, ext: ".md", mime: "text/markdown" },
};

export async function getSpecArtifact(
  slug: string,
  kind: SpecArtifactKind
): Promise<ArtifactInfo | null> {
  const config = ARTIFACT_META[kind];
  if (!config) return null;

  const filePath = path.join(config.dir, `${slug}${config.ext}`);
  if (!(await pathExists(filePath))) return null;

  return {
    path: filePath,
    mime: config.mime,
    downloadName: `${slug}${config.ext}`,
  };
}

export { SPEC_TOOL_HOME, SNAPSHOT_DIR };
const parseArtifactLinks = (value: unknown): ArtifactLink[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const pathStr = ensureString(record.path);
      if (!pathStr) return null;
      return {
        id: ensureString(record.id) ?? pathStr,
        path: pathStr,
        summary: ensureString(record.summary),
        status: ensureString(record.status),
        intent: ensureString(record.intent),
        addedAt: ensureString((record.added_at as unknown) ?? record.addedAt),
      };
    })
    .filter((entry): entry is ArtifactLink => Boolean(entry))
    .sort((a, b) => {
      const timeA = a.addedAt ? Date.parse(a.addedAt) : 0;
      const timeB = b.addedAt ? Date.parse(b.addedAt) : 0;
      return timeB - timeA;
    });
};

const parseProgressUpdates = (value: unknown): ProgressUpdate[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id =
        ensureString(record.id) ??
        ensureString(record.timestamp) ??
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        id,
        timestamp: ensureString(record.timestamp),
        userQuote: ensureString(record.user_quote ?? record.userQuote),
        overarchingIntent: ensureString(record.overarching_intent ?? record.overarchingIntent),
        subgoalIntent: ensureString(record.subgoal_intent ?? record.subgoalIntent),
        intentConnection: ensureString(record.intent_connection ?? record.intentConnection),
        technicalNuance: ensureString(record.technical_nuance ?? record.technicalNuance),
        uxNow: ensureString(record.ux_now ?? record.uxNow),
        validationEntry: ensureString(record.validation_entry ?? record.validationEntry),
        validationSteps: ensureString(record.validation_steps ?? record.validationSteps),
        validationNotice: ensureString(record.validation_notice ?? record.validationNotice),
        validationRequirement: ensureString(
          record.validation_requirement ?? record.validationRequirement
        ),
        requirementsNote: ensureString(record.requirements_note ?? record.requirementsNote),
        tasksCompleted: ensureArray(record.tasks_completed ?? record.tasksCompleted),
        intentStatuses: ensureArray(record.intent_statuses ?? record.intentStatuses),
        newUserStories: ensureArray(record.new_user_stories ?? record.newUserStories),
        renderText: ensureString(record.render_text ?? record.renderText),
      };
    })
    .filter((entry): entry is ProgressUpdate => Boolean(entry))
    .sort((a, b) => {
      const timeA = a.timestamp ? Date.parse(a.timestamp) : 0;
      const timeB = b.timestamp ? Date.parse(b.timestamp) : 0;
      return timeB - timeA;
    });
};

const parseCommandReviews = (value: unknown): CommandReview[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const command = ensureString(record.command);
      if (!command) return null;
      return {
        command,
        intent: ensureString(record.intent),
        validation: ensureString(record.validation),
        status: ensureString(record.status),
        notes: ensureString(record.notes),
        nextAction: ensureString(record.next_action ?? record.nextAction),
      };
    })
    .filter((entry): entry is CommandReview => Boolean(entry));
};

const parseConcerns = (value: unknown): UXConcern[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const title = ensureString(record.title);
      if (!title) return null;
      return {
        title,
        status: ensureString(record.status),
        notes: ensureString(record.notes),
      };
    })
    .filter((entry): entry is UXConcern => Boolean(entry));
};

const parseActionItems = (value: unknown): ActionItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id = ensureString(record.id) ?? ensureString(record.title);
      const title = ensureString(record.title);
      if (!id || !title) return null;
      return {
        id,
        title,
        status: ensureString(record.status),
        notes: ensureString(record.notes),
      };
    })
    .filter((entry): entry is ActionItem => Boolean(entry));
};

const parseAlignmentReviews = (value: unknown): AlignmentReview[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id = ensureString(record.id) ?? ensureString(record.created_at ?? record.createdAt);
      if (!id) return null;
      return {
        id,
        title: ensureString(record.title),
        status: ensureString(record.status),
        reasoning: ensureString(record.reasoning),
        progressReference: ensureString(record.progress_reference ?? record.progressReference),
        createdAt: ensureString(record.created_at ?? record.createdAt),
        evidence: ensureArray(record.evidence),
      };
    })
    .filter((entry): entry is AlignmentReview => Boolean(entry))
    .sort((a, b) => {
      const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
      return timeB - timeA;
    });
};
