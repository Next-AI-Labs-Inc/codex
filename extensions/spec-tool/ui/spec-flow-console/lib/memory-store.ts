import { promises as fs } from "fs";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

const PROJECT_ROOT = process.env.AGENT_SWARM_PATH
  ? path.resolve(process.env.AGENT_SWARM_PATH)
  : path.resolve(process.cwd(), "../../");

const LOGS_DIR = path.join(PROJECT_ROOT, "logs");

export type MemoryState = "active" | "paused" | "archived";

export interface RawMemoryRecord {
  id?: string;
  timestamp?: string;
  created_at?: string;
  repo?: string;
  event_type?: string;
  context?: string;
  command?: string;
  lesson?: string;
  confidence?: number | string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  state?: MemoryState;
  success_rate?: string;
  [key: string]: unknown;
}

interface InternalMemoryRecord {
  id: string;
  repo: string;
  timestamp: string;
  raw: RawMemoryRecord;
  file: string;
  lineIndex: number;
}

export interface MemoryRecord {
  id: string;
  repo: string;
  timestamp: string;
  context: string;
  lesson: string;
  event_type: string;
  tags: string[];
  confidence: number | null;
  metadata: Record<string, unknown>;
  state: MemoryState;
  command?: string;
  success_rate?: string;
}

export interface MemoryQueryOptions {
  search?: string;
  repo?: string;
  tags?: string[];
  event_type?: string;
  page?: number;
  size?: number;
}

function ensureLogsDir() {
  if (!existsSync(LOGS_DIR)) {
    throw new Error(
      `Logs directory not found at ${LOGS_DIR}. Set AGENT_SWARM_PATH to the agent-swarm-mcp root.`,
    );
  }
}

function normalizeConfidence(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((tag) => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[, ]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function computeMemoryId(
  raw: RawMemoryRecord,
  file: string,
  lineIndex: number,
): string {
  if (raw.id && typeof raw.id === "string") {
    return raw.id;
  }
  const base = JSON.stringify({
    file,
    lineIndex,
    timestamp: raw.timestamp,
    repo: raw.repo,
    context: raw.context,
    lesson: raw.lesson,
  });
  return crypto.createHash("sha1").update(base).digest("hex");
}

function toPublicRecord(record: InternalMemoryRecord): MemoryRecord {
  const { raw, id, repo, timestamp } = record;
  return {
    id,
    repo,
    timestamp,
    context: raw.context ?? "",
    lesson: raw.lesson ?? "",
    event_type: typeof raw.event_type === "string" ? raw.event_type : "pattern",
    tags: normalizeTags(raw.tags),
    confidence: normalizeConfidence(raw.confidence),
    metadata: typeof raw.metadata === "object" && raw.metadata !== null
      ? (raw.metadata as Record<string, unknown>)
      : {},
    state:
      raw.state === "paused" || raw.state === "archived"
        ? raw.state
        : "active",
    command: raw.command && typeof raw.command === "string" ? raw.command : undefined,
    success_rate:
      raw.success_rate && typeof raw.success_rate === "string"
        ? raw.success_rate
        : undefined,
  };
}

async function readJsonl(filePath: string): Promise<InternalMemoryRecord[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  const records: InternalMemoryRecord[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    try {
      const parsed = JSON.parse(line) as RawMemoryRecord;
      const repo =
        typeof parsed.repo === "string"
          ? parsed.repo
          : path.basename(filePath, ".jsonl");
      const timestamp =
        typeof parsed.timestamp === "string"
          ? parsed.timestamp
          : new Date(0).toISOString();
      const id = computeMemoryId(parsed, filePath, index);

      records.push({
        id,
        repo,
        timestamp,
        raw: parsed,
        file: filePath,
        lineIndex: index,
      });
    } catch {
      // Skip malformed line but keep file integrity
      continue;
    }
  }

  return records;
}

async function loadAll(): Promise<InternalMemoryRecord[]> {
  ensureLogsDir();
  const files = await fs.readdir(LOGS_DIR);
  const jsonlFiles = files.filter((file) => file.endsWith(".jsonl"));

  const allRecords: InternalMemoryRecord[] = [];
  for (const file of jsonlFiles) {
    const filePath = path.join(LOGS_DIR, file);
    const records = await readJsonl(filePath);
    allRecords.push(...records);
  }

  return allRecords;
}

export async function getMemories(
  options: MemoryQueryOptions = {},
): Promise<{
  items: MemoryRecord[];
  total: number;
  page: number;
  size: number;
  pages: number;
}> {
  const {
    search = "",
    repo,
    tags = [],
    event_type,
    page = 1,
    size = 10,
  } = options;

  const allRecords = await loadAll();

  const searchTerm = search.trim().toLowerCase();
  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));

  const filtered = allRecords.filter((record) => {
    if (repo && record.repo !== repo) return false;

    const publicRecord = toPublicRecord(record);

    if (event_type && publicRecord.event_type !== event_type) return false;

    if (tagSet.size > 0) {
      const lowerTags = publicRecord.tags.map((tag) => tag.toLowerCase());
      const hasAllTags = [...tagSet].every((tag) => lowerTags.includes(tag));
      if (!hasAllTags) return false;
    }

    if (searchTerm.length > 0) {
      const haystack = [
        publicRecord.context,
        publicRecord.lesson,
        publicRecord.repo,
        publicRecord.event_type,
        publicRecord.command ?? "",
        publicRecord.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(searchTerm)) return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    const tsA = Date.parse(a.timestamp);
    const tsB = Date.parse(b.timestamp);
    return tsB - tsA;
  });

  const total = filtered.length;
  const start = (page - 1) * size;
  const end = Math.min(start + size, total);
  const paged = filtered.slice(start, end).map(toPublicRecord);

  const pages = Math.max(1, Math.ceil(total / size));

  return {
    items: paged,
    total,
    page,
    size,
    pages,
  };
}

export async function getMemoryById(id: string): Promise<MemoryRecord | null> {
  if (!id) return null;

  const allRecords = await loadAll();
  const match = allRecords.find((record) => record.id === id);
  return match ? toPublicRecord(match) : null;
}

async function rewriteFile(
  filePath: string,
  records: InternalMemoryRecord[],
): Promise<void> {
  const lines = records
    .sort((a, b) => a.lineIndex - b.lineIndex)
    .map((record) => JSON.stringify({ ...record.raw, id: record.id }));

  await fs.writeFile(filePath, lines.join("\n") + "\n", "utf-8");
}

export async function updateMemory(
  id: string,
  updates: Partial<RawMemoryRecord>,
): Promise<MemoryRecord | null> {
  if (!id) return null;

  const allRecords = await loadAll();
  const target = allRecords.find((record) => record.id === id);
  if (!target) return null;

  const updatedRaw: RawMemoryRecord = {
    ...target.raw,
    ...updates,
    id,
    created_at: target.raw.created_at ?? target.raw.timestamp,
    metadata: {
      ...(target.raw.metadata ?? {}),
      ...(updates.metadata ?? {}),
    },
    updated_at: new Date().toISOString(),
  };

  if (updatedRaw.metadata && !("created_at" in updatedRaw.metadata)) {
    updatedRaw.metadata.created_at =
      target.raw.metadata?.created_at ?? target.raw.timestamp;
  }

  const fileRecords = allRecords.filter(
    (record) => record.file === target.file,
  );

  const nextFileRecords = fileRecords.map((record) =>
    record.id === id
      ? {
          ...record,
          raw: updatedRaw,
        }
      : record,
  );

  await rewriteFile(target.file, nextFileRecords);

  return toPublicRecord({
    ...target,
    raw: updatedRaw,
  });
}

export async function deleteMemory(
  id: string,
): Promise<{ success: boolean; removed: number }> {
  if (!id) return { success: false, removed: 0 };

  const allRecords = await loadAll();
  const target = allRecords.find((record) => record.id === id);
  if (!target) return { success: false, removed: 0 };

  const remaining = allRecords.filter(
    (record) => record.file === target.file && record.id !== id,
  );

  await rewriteFile(target.file, remaining);

  return { success: true, removed: 1 };
}

export async function createMemory(
  repo: string,
  payload: Partial<RawMemoryRecord>,
): Promise<MemoryRecord> {
  if (!repo) {
    throw new Error("Repo is required to create a memory.");
  }

  ensureLogsDir();

  const logFile = path.join(LOGS_DIR, `${repo}.jsonl`);
  const timestamp = new Date().toISOString();
  const raw: RawMemoryRecord = {
    repo,
    timestamp,
    created_at: timestamp,
    event_type: payload.event_type ?? "pattern",
    context: payload.context ?? "",
    lesson: payload.lesson ?? "",
    confidence: payload.confidence ?? null,
    tags: payload.tags ?? [],
    metadata: {
      ...(payload.metadata ?? {}),
      created_at: timestamp,
    },
    state:
      payload.state === "paused" || payload.state === "archived"
        ? payload.state
        : "active",
    command: payload.command,
    success_rate: payload.success_rate,
  };

  const id = computeMemoryId(raw, logFile, Number.MAX_SAFE_INTEGER);
  raw.id = id;

  await fs.appendFile(logFile, JSON.stringify(raw) + "\n", "utf-8");

  return {
    id,
    repo,
    timestamp,
    context: raw.context ?? "",
    lesson: raw.lesson ?? "",
    event_type: raw.event_type ?? "pattern",
    tags: normalizeTags(raw.tags),
    confidence: normalizeConfidence(raw.confidence),
    metadata: raw.metadata ?? {},
    state: raw.state ?? "active",
    command: raw.command,
    success_rate: raw.success_rate,
  };
}

export async function listAllMemories(): Promise<MemoryRecord[]> {
  const allRecords = await loadAll();
  return allRecords.map(toPublicRecord);
}

export async function getRepoSummaries(): Promise<
  Array<{
    repo: string;
    total: number;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
    activeCount: number;
    archivedCount: number;
    pausedCount: number;
  }>
> {
  const allRecords = await loadAll();
  const summaryMap = new Map<
    string,
    {
      repo: string;
      total: number;
      firstTimestamp: string | null;
      lastTimestamp: string | null;
      activeCount: number;
      archivedCount: number;
      pausedCount: number;
    }
  >();

  for (const record of allRecords) {
    const publicRecord = toPublicRecord(record);
    const current = summaryMap.get(publicRecord.repo) ?? {
      repo: publicRecord.repo,
      total: 0,
      firstTimestamp: null as string | null,
      lastTimestamp: null as string | null,
      activeCount: 0,
      archivedCount: 0,
      pausedCount: 0,
    };

    current.total += 1;

    if (!current.firstTimestamp || current.firstTimestamp > publicRecord.timestamp) {
      current.firstTimestamp = publicRecord.timestamp;
    }

    if (!current.lastTimestamp || current.lastTimestamp < publicRecord.timestamp) {
      current.lastTimestamp = publicRecord.timestamp;
    }

    if (publicRecord.state === "archived") current.archivedCount += 1;
    else if (publicRecord.state === "paused") current.pausedCount += 1;
    else current.activeCount += 1;

    summaryMap.set(publicRecord.repo, current);
  }

  return Array.from(summaryMap.values()).sort(
    (a, b) => (b.lastTimestamp ? Date.parse(b.lastTimestamp) : 0) -
      (a.lastTimestamp ? Date.parse(a.lastTimestamp) : 0),
  );
}

export async function getCategorySummaries(): Promise<
  Array<{ tag: string; count: number }>
> {
  const allRecords = await loadAll();
  const tagCounts = new Map<string, number>();

  for (const record of allRecords) {
    const tags = normalizeTags(record.raw.tags);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getRelatedMemories(
  id: string,
  limit = 5,
): Promise<MemoryRecord[]> {
  if (!id) return [];

  const allRecords = await loadAll();
  const target = allRecords.find((record) => record.id === id);
  if (!target) return [];

  const targetPublic = toPublicRecord(target);
  const targetTags = new Set(targetPublic.tags.map((tag) => tag.toLowerCase()));

  const scored = allRecords
    .filter((record) => record.id !== id)
    .map((record) => {
      const publicRecord = toPublicRecord(record);
      let score = 0;

      // Tag overlap
      const tags = publicRecord.tags.map((tag) => tag.toLowerCase());
      tags.forEach((tag) => {
        if (targetTags.has(tag)) score += 2;
      });

      // Same repo weight
      if (publicRecord.repo === targetPublic.repo) score += 1;

      // Keyword overlap (context + lesson)
      const targetText = `${targetPublic.context} ${targetPublic.lesson}`.toLowerCase();
      const text = `${publicRecord.context} ${publicRecord.lesson}`.toLowerCase();
      const sharedKeywords = new Set(
        targetText
          .split(/\W+/)
          .filter((word) => word.length > 3 && text.includes(word)),
      );
      score += sharedKeywords.size * 0.2;

      return { record: publicRecord, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return Date.parse(b.record.timestamp) - Date.parse(a.record.timestamp);
    });

  return scored.slice(0, limit).map((entry) => entry.record);
}
