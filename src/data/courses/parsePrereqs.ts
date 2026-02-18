// src/data/courses/parsePrereqs.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";

// ✅ schema is in src/models/schema.ts
import type { ReqNode, UUID } from "../../models/schema";
import { Standing } from "../../models/schema";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

type CourseRow = {
  id: UUID;
  deptCode?: string | null;
  deptName?: string | null;
  number?: string | null;
  code?: string | null;
  title: string;
  description: string;
  credits: number;
  active: boolean;

  rawPrerequisites?: string | null;
  prerequisites?: ReqNode | null;

  rawCorequisites?: string | null;
  corequisites?: ReqNode | null;

  advisorNotes?: string | null;
  url?: string | null;

  [k: string]: any;
};

const HAS_OPENAI_KEY = !!process.env.OPENAI_API_KEY;
const USE_AI = process.env.PREREQ_USE_AI === "1" && HAS_OPENAI_KEY; // default OFF unless set
const CLEAN_RAW_WITH_AI = process.env.PREREQ_CLEAN_RAW === "1" && USE_AI; // optional extra
const DEBUG = process.env.PREREQ_DEBUG === "1";
const MODEL = process.env.PREREQ_MODEL || "gpt-4o-mini";
const AI_SLEEP_MS = Number(process.env.PREREQ_AI_SLEEP_MS || "120");

const client = USE_AI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }) : null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Removes invisible/formatting characters (ZWSP, BOM, bidi marks, soft hyphen, etc.) */
function stripInvisible(s: string): string {
  return s.replace(
    /[\u0000-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g,
    ""
  );
}

/**
 * Normalize for storing back into JSON:
 * - strips invisible chars
 * - unicode normalize
 * - normalizes weird spaces
 * - collapses whitespace
 * - trims
 */
function normalizeRaw(s: string): string {
  return stripInvisible(s)
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/[•·]/g, ";")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize for matching:
 * - includes normalizeRaw
 * - removes punctuation to make regex matching stable
 */
function normalizeForMatching(s: string): string {
  return normalizeRaw(s)
    .replace(/[(),.;:/\\|[\]{}<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "ACC210" / "ACC 210" -> "ACC 210" */
function canonicalizeCourseCode(raw: string): string {
  const t = normalizeForMatching(raw).toUpperCase().replace(/\s+/g, "");
  const m = t.match(/^([A-Z]{2,6})(\d{3}[A-Z]?)$/);
  if (!m) return normalizeForMatching(raw).toUpperCase().trim();
  return `${m[1]} ${m[2]}`;
}

function normalizeCodeKey(raw: string): string {
  return canonicalizeCourseCode(raw).replace(/\s+/g, " ").trim().toUpperCase();
}

/** Extract course codes from any prereq string. */
function extractCourseCodes(raw: string): string[] {
  const s = normalizeForMatching(raw).toUpperCase();
  const re = /\b[A-Z]{2,6}\s*\d{3}[A-Z]?\b/g;

  const hits = s.match(re) ?? [];
  const canonical = hits.map((c) => normalizeCodeKey(c));

  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of canonical) {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out;
}

function extractMinStanding(raw: string): Standing | null {
  const s = normalizeForMatching(raw).toUpperCase();

  // U2/U3/U4/U5...
  const u = s.match(/\bU([1-5])\b/);
  if (u) {
    const n = Number(u[1]);
    if (n >= 1 && n <= 5) return n as Standing;
  }

  if (/\bFRESHMAN\b/.test(s)) return Standing.FRESHMAN;
  if (/\bSOPHOMORE\b/.test(s)) return Standing.SOPHOMORE;
  if (/\bJUNIOR\b/.test(s)) return Standing.JUNIOR;
  if (/\bSENIOR\b/.test(s)) return Standing.SENIOR;
  if (/\bGRADUATE\b/.test(s)) return Standing.GRADUATE;

  return null;
}

/** Schema validation (loose on COURSE.courseId: allow unknown codes or IDs) */
function isValidReqNode(node: any): node is ReqNode {
  if (!node || typeof node !== "object" || typeof node.kind !== "string") return false;

  switch (node.kind) {
    case "TRUE":
      return Object.keys(node).length === 1;

    case "COURSE":
      return typeof node.courseId === "string" && node.courseId.trim().length > 0;

    case "STANDING_AT_LEAST":
      return Number.isInteger(node.minStanding) && node.minStanding >= 1 && node.minStanding <= 5;

    case "AND":
    case "OR":
      return Array.isArray(node.nodes) && node.nodes.length >= 1 && node.nodes.every(isValidReqNode);

    default:
      return false;
  }
}

/** Flatten + dedupe + remove TRUEs in AND / simplify OR(TRUE,...) to TRUE */
function simplify(node: ReqNode): ReqNode {
  switch (node.kind) {
    case "TRUE":
    case "COURSE":
    case "STANDING_AT_LEAST":
      return node;

    case "AND": {
      const kids = node.nodes.map(simplify);
      const withoutTrue = kids.filter((k) => k.kind !== "TRUE");

      const flat: ReqNode[] = [];
      for (const k of withoutTrue) {
        if (k.kind === "AND") flat.push(...k.nodes);
        else flat.push(k);
      }

      const seen = new Set<string>();
      const deduped: ReqNode[] = [];
      for (const k of flat) {
        const key = JSON.stringify(k);
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(k);
        }
      }

      if (deduped.length === 0) return { kind: "TRUE" };
      if (deduped.length === 1) return deduped[0];
      return { kind: "AND", nodes: deduped };
    }

    case "OR": {
      const kids = node.nodes.map(simplify);

      if (kids.some((k) => k.kind === "TRUE")) return { kind: "TRUE" };

      const flat: ReqNode[] = [];
      for (const k of kids) {
        if (k.kind === "OR") flat.push(...k.nodes);
        else flat.push(k);
      }

      const seen = new Set<string>();
      const deduped: ReqNode[] = [];
      for (const k of flat) {
        const key = JSON.stringify(k);
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(k);
        }
      }

      if (deduped.length === 0) return { kind: "TRUE" };
      if (deduped.length === 1) return deduped[0];
      return { kind: "OR", nodes: deduped };
    }
  }
}

function buildCodeToIdMap(courses: CourseRow[]): Map<string, string> {
  const codeToId = new Map<string, string>();

  for (const c of courses) {
    if (!c.id) continue;

    // map using c.code if present
    if (c.code) codeToId.set(normalizeCodeKey(c.code), String(c.id));

    // if id is code-like, map that too
    codeToId.set(normalizeCodeKey(String(c.id)), String(c.id));

    // map dept+number variants
    if (c.deptCode && c.number) {
      codeToId.set(normalizeCodeKey(`${c.deptCode} ${c.number}`), String(c.id));
      codeToId.set(normalizeCodeKey(`${c.deptCode}${c.number}`), String(c.id));
    }
  }

  return codeToId;
}

/**
 * Remap COURSE.courseId:
 * - if it looks like a course code, map to canonical ID if we have it
 * - otherwise keep it as-is (lets you keep edges to unsaid/unscraped courses as "WRT 102")
 */
function remapCourseIdsToCanonicalIds(node: ReqNode, codeToId: Map<string, string>): ReqNode {
  switch (node.kind) {
    case "TRUE":
    case "STANDING_AT_LEAST":
      return node;

    case "COURSE": {
      const key = normalizeCodeKey(node.courseId);
      const mapped = codeToId.get(key);
      return { kind: "COURSE", courseId: mapped ?? canonicalizeCourseCode(node.courseId) };
    }

    case "AND":
    case "OR":
      return simplify({
        kind: node.kind,
        nodes: node.nodes.map((n) => remapCourseIdsToCanonicalIds(n, codeToId)),
      });
  }
}

/**
 * Deterministic parse that DOES NOT create "OR of standing nodes" for text like "U3 or U4 standing".
 *
 * Strategy:
 * - Extract standing first (minStanding)
 * - Remove standing phrases so their "or" doesn't interfere with clause splits
 * - Split into AND-ish segments by '.' ';'
 * - Within each segment, split on "or" to build OR alternatives
 * - Drop "or permission/equivalent/approval..." clauses with no course codes
 * - Convert codes to COURSE nodes (code string for now), then remap to canonical IDs after
 */
function deterministicTreeFromRaw(
  raw: string,
  codeToId: Map<string, string>
): ReqNode {
  const cleaned = normalizeRaw(raw);
  if (!cleaned) return { kind: "TRUE" };

  const minStanding = extractMinStanding(cleaned);

  // remove standing phrases so "U3 or U4 standing" doesn't turn into OR clauses
  let s = cleaned
    .replace(/\bU[1-5]\s*or\s*U[1-5]\s*standing\b/gi, " ")
    .replace(/\bU[1-5]\s*or\s*higher\s*standing\b/gi, " ")
    .replace(
      /\b(Junior|Senior|Sophomore|Freshman|Graduate)\s*or\s*(Junior|Senior|Sophomore|Freshman|Graduate)\s*standing\b/gi,
      " "
    )
    .replace(/\b(Junior|Senior|Sophomore|Freshman|Graduate)\s*standing\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const segments = s.split(/[.;]/g).map((x) => x.trim()).filter(Boolean);

  const segmentNodes: ReqNode[] = [];

  for (const seg of segments) {
    const orParts = seg.split(/\bor\b/gi).map((x) => x.trim()).filter(Boolean);

    const clauseNodes: ReqNode[] = [];
    for (const part of orParts) {
      const codes = extractCourseCodes(part);

      // ignore non-course clauses like "permission", "equivalent", majors/minors, etc.
      if (codes.length === 0) continue;

      const nodes: ReqNode[] = codes.map((code) => ({
        kind: "COURSE",
        courseId: code, // will remap after
      }));

      clauseNodes.push(nodes.length === 1 ? nodes[0] : { kind: "AND", nodes });
    }

    if (clauseNodes.length === 0) continue;

    segmentNodes.push(clauseNodes.length === 1 ? clauseNodes[0] : { kind: "OR", nodes: clauseNodes });
  }

  let base: ReqNode;
  if (segmentNodes.length === 0) base = { kind: "TRUE" };
  else if (segmentNodes.length === 1) base = segmentNodes[0];
  else base = { kind: "AND", nodes: segmentNodes };

  // AND in standing once (this fixes the ADV 475 duplicated-standing issue)
  if (minStanding) {
    const standingNode: ReqNode = { kind: "STANDING_AT_LEAST", minStanding };
    if (base.kind === "TRUE") base = standingNode;
    else base = simplify({ kind: "AND", nodes: [standingNode, base] });
  }

  // finally map "ACC 210" -> canonical id if present
  return remapCourseIdsToCanonicalIds(simplify(base), codeToId);
}

/**
 * Optional AI cleanup: rewrite prereq text to a compact, parse-friendly form
 * while preserving ONLY what matters for the prereq graph (course codes + standing).
 *
 * Returns "" if nothing relevant remains (so we can treat it as null/TRUE).
 */
async function aiCleanRawText(raw: string): Promise<string> {
  if (!CLEAN_RAW_WITH_AI || !client) return normalizeRaw(raw);

  const sys = `
Rewrite the prerequisite/corequisite text into a compact form that keeps ONLY:
- explicit course codes (like "ACC 210", "WRT 102", "FRN 395")
- standing constraints (U1-U5, Freshman/Sophomore/Junior/Senior/Graduate, "or higher standing")

Remove everything else (majors/minors, GPA, permission/consent, placement, applications, URLs, contracts, notes, etc.).

Formatting rules:
- Output ONE plain text line. No quotes. No markdown.
- Use "and" / "or" and parentheses if needed.
- If nothing relevant remains, output an empty string.
`.trim();

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: normalizeRaw(raw) },
      ],
    });

    const text = (res.choices[0]?.message?.content ?? "").trim();
    return normalizeRaw(text);
  } catch {
    return normalizeRaw(raw);
  }
}

/**
 * AI parse into a ReqNode. This is used as a "better parser" for complex strings.
 * It is safe because we validate + simplify + remap course IDs afterwards.
 */
async function aiParseToTree(raw: string, miniCodeToIdLines: string[]): Promise<ReqNode | null> {
  if (!USE_AI || !client) return null;

  const systemPrompt = `
You convert university prerequisites/corequisites into a strict JSON tree.

Return EXACTLY one JSON object matching:

ReqNode =
| { "kind":"AND", "nodes": ReqNode[] }
| { "kind":"OR", "nodes": ReqNode[] }
| { "kind":"COURSE", "courseId":"<ID from map OR a canonical course code like 'WRT 102'>" }
| { "kind":"STANDING_AT_LEAST", "minStanding": 1|2|3|4|5 }
| { "kind":"TRUE" }

Rules:
- Output VALID JSON only. No markdown. No extra keys.
- COURSE.courseId:
  * If the course appears in the CODE=>ID map, use its ID.
  * Otherwise, use the canonical course code like "ABC 123".
- Parse "and" => AND.
- Parse "or"/"either"/"one of"/"any of" => OR.
- Standing:
  * "U2 or higher standing" -> minStanding:2
  * "Junior" -> 3; "Senior" -> 4; "Graduate" -> 5.
  * "U3 or U4 standing" -> minStanding:3 (NOT an OR of standing nodes)
- Ignore majors/minors, GPA, permission/consent, placement, applications, URLs, contracts, notes, etc.
  If the text contains ONLY ignored constraints, return { "kind":"TRUE" }.
`.trim();

  const userPrompt = `
CODE => ID map (use these IDs when a code appears here):
${miniCodeToIdLines.join("\n")}

Raw text:
${raw}
`.trim();

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = res.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);

    if (!isValidReqNode(parsed)) return null;
    return simplify(parsed);
  } catch {
    return null;
  }
}

/**
 * Main parse:
 * 1) Normalize + (optional) AI-clean the raw text
 * 2) Deterministic baseline (fast + stable)
 * 3) If AI enabled and looks complex, try AI parse
 * 4) Always remap course IDs after parsing (so nodes match your dataset IDs)
 */
async function parseReqText(
  rawInput: string,
  codeToId: Map<string, string>
): Promise<{ cleanedRaw: string; tree: ReqNode }> {
  const normalized = normalizeRaw(rawInput);
  if (!normalized) return { cleanedRaw: "", tree: { kind: "TRUE" } };

  const cleanedRaw = await aiCleanRawText(normalized);
  const effectiveText = cleanedRaw; // parse from cleaned (or normalized if AI-clean off)

  const det = deterministicTreeFromRaw(effectiveText, codeToId);

  if (DEBUG) {
    console.log(`[DEBUG] effective="${effectiveText}" det=${JSON.stringify(det)}`);
  }

  if (!USE_AI) {
    return { cleanedRaw: cleanedRaw || normalized, tree: det };
  }

  const extractedCodes = extractCourseCodes(effectiveText);
  const mentionedMappedCodes = extractedCodes.filter((c) => codeToId.has(c));
  const miniCodeToIdLines = mentionedMappedCodes.slice(0, 50).map((code) => `${code} => ${codeToId.get(code)}`);

  const looksComplex =
    /[()]/.test(effectiveText) ||
    /\b(either|one of|any of)\b/i.test(effectiveText) ||
    (/\bor\b/i.test(effectiveText) && extractedCodes.length >= 2) ||
    /\bU[1-5]\s*or\s*U[1-5]\b/i.test(effectiveText);

  if (!looksComplex || miniCodeToIdLines.length === 0) {
    return { cleanedRaw: cleanedRaw || normalized, tree: det };
  }

  const aiTreeRaw = await aiParseToTree(effectiveText, miniCodeToIdLines);
  if (!aiTreeRaw) {
    return { cleanedRaw: cleanedRaw || normalized, tree: det };
  }

  // final remap (makes AI output match your canonical IDs)
  const aiTree = remapCourseIdsToCanonicalIds(aiTreeRaw, codeToId);

  // If AI collapses to TRUE but deterministic found real constraints, keep deterministic
  if (aiTree.kind === "TRUE" && det.kind !== "TRUE") {
    return { cleanedRaw: cleanedRaw || normalized, tree: det };
  }

  return { cleanedRaw: cleanedRaw || normalized, tree: aiTree };
}

async function main() {
  const folder = path.resolve(process.cwd(), "src/data/courses");
  const inputPath = path.resolve(folder, "all.json");

  // ✅ output in SAME folder as this parser
  const outPath = path.resolve(folder, "all.withTrees.json");

  const courses: CourseRow[] = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const codeToId = buildCodeToIdMap(courses);

  for (const course of courses) {
    // --- prerequisites ---
    const rawP = course.rawPrerequisites;
    if (rawP == null || normalizeRaw(String(rawP)).length === 0) {
      course.rawPrerequisites = null;
      course.prerequisites = null;
    } else {
      const { cleanedRaw, tree } = await parseReqText(String(rawP), codeToId);

      // store cleaned raw back (mentor wants this cleaned safely)
      course.rawPrerequisites = cleanedRaw.length ? cleanedRaw : null;

      // store tree (null if TRUE)
      course.prerequisites = tree.kind === "TRUE" ? { kind: "TRUE" } : tree;

      if (USE_AI) await sleep(AI_SLEEP_MS);
    }

    // --- corequisites ---
    const rawC = (course as any).rawCorequisites;
    if (rawC == null || normalizeRaw(String(rawC)).length === 0) {
      course.rawCorequisites = null;
      course.corequisites = null;
    } else {
      const { cleanedRaw, tree } = await parseReqText(String(rawC), codeToId);

      course.rawCorequisites = cleanedRaw.length ? cleanedRaw : null;
      course.corequisites = tree.kind === "TRUE" ? { kind: "TRUE" } : tree;

      if (USE_AI) await sleep(AI_SLEEP_MS);
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(courses, null, 2), "utf8");
  console.log(
    `✅ Done. Output: ${outPath} (USE_AI=${USE_AI ? "1" : "0"}, CLEAN_RAW_WITH_AI=${CLEAN_RAW_WITH_AI ? "1" : "0"})`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
