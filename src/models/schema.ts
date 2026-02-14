// ===== schema.ts (updates) =====
export type UUID = string;

export enum Standing {
  FRESHMAN = 1, SOPHOMORE, JUNIOR, SENIOR, GRADUATE
}

// Disabled: General Ed requirements
// export enum SBCCategory {
//   EXP = "EXP", HUM = "HUM", ART = "ART", SBS = "SBS", STEM = "STEM",
//   DIV = "DIV", USA = "USA", LANG = "LANG", WRT = "WRT", TECH_ELECTIVE = "TECH_ELECTIVE",
// }

// --- User now includes takingNow ---
export interface User {
  id: UUID;                      // == auth.users.id
  majorId: UUID | null;
  standing: Standing;
  completedCourses: UUID[];      // finished in past terms
  takingNow: UUID[];             // selected/enrolled this term
}

export interface Course {
  id: UUID;
  deptCode: string; number: string; code: string;
  title: string; description: string; credits: number; active: boolean;
  prerequisites?: ReqNode;       // AND/OR tree
  corequisites?: ReqNode;        // AND/OR tree
  advisorNotes?: string;
  // fulfills: Fulfillment[];  // Disabled: General Ed requirements
}

// Disabled: General Ed requirements
// export interface Fulfillment { category: SBCCategory; count?: number; credits?: number; }

export type ReqNode = AndNode | OrNode | CourseNode | StandingNode | TrueNode;
export interface AndNode { kind: "AND"; nodes: ReadonlyArray<ReqNode>; }
export interface OrNode  { kind: "OR";  nodes: ReadonlyArray<ReqNode>; }
export interface CourseNode { kind: "COURSE"; courseId: UUID; }
export interface StandingNode { kind: "STANDING_AT_LEAST"; minStanding: Standing; }
export interface TrueNode { kind: "TRUE"; }

// ===== Evaluation =====
type EvalMode = "PREREQ" | "COREQ";

/** Evaluate a requirement node against a user.
 *  PREREQ: course leaf must be in completedCourses.
 *  COREQ : course leaf must be in completedCourses OR takingNow.
 */
export function evaluateReq(node: ReqNode, user: User, mode: EvalMode = "PREREQ"): boolean {
  switch (node.kind) {
    case "TRUE":
      return true;
    case "COURSE": {
      const done = user.completedCourses.includes(node.courseId);
      if (mode === "PREREQ") return done;
      return done || user.takingNow.includes(node.courseId);
    }
    case "STANDING_AT_LEAST":
      return user.standing >= node.minStanding;
    case "AND":
      return node.nodes.every(n => evaluateReq(n, user, mode));
    case "OR":
      return node.nodes.some(n => evaluateReq(n, user, mode));
  }
}

/** Can the user enroll in `course` given their current plan (takingNow inside `user`)? */
export function canTakeCourse(course: Course, user: User): boolean {
  if (!course.active) return false;

  const prereqOK = !course.prerequisites
    ? true
    : evaluateReq(course.prerequisites, user, "PREREQ");

  const coreqOK = !course.corequisites
    ? true
    : evaluateReq(course.corequisites, user, "COREQ");

  return prereqOK && coreqOK;
}

// ===== Example: evaluator interface =====
// This is optional but helpful later if you want to evaluate logic.
// Prereq logic:
  //        AND
  //      /     \
  //  COURSE   COURSE
  //  (214)    (215)
	