/**
 * Utility functions for working with course data (ReqNode AND/OR trees).
 * Works even when only some courses are scraped.
 */

/**
 * Recursively extract all COURSE ids from a ReqNode tree.
 * Defensive: handles missing/odd shapes without crashing.
 * @param {any} node
 * @returns {string[]} array of course UUIDs
 */
export function extractCourseIds(node) {
  if (!node || typeof node !== "object") return [];

  switch (node.kind) {
    case "TRUE":
    case "STANDING_AT_LEAST":
      return [];

    case "COURSE":
      return node.courseId ? [node.courseId] : [];

    case "AND":
    case "OR": {
      const nodes = Array.isArray(node.nodes) ? node.nodes : [];
      return nodes.flatMap((n) => extractCourseIds(n));
    }

    default:
      return [];
  }
}

/**
 * Direct prereq course ids for a course (no coreqs).
 * IMPORTANT: this is what your graph builder uses.
 * @param {any} course
 * @returns {string[]}
 */
export function getPrerequisiteCourseIds(course) {
  if (!course?.prerequisites) return [];
  return extractCourseIds(course.prerequisites);
}

/**
 * Direct coreq course ids for a course.
 * @param {any} course
 * @returns {string[]}
 */
export function getCorequisiteCourseIds(course) {
  if (!course?.corequisites) return [];
  return extractCourseIds(course.corequisites);
}

/**
 * Build id -> course
 * @param {any[]} courses
 */
export function buildCourseMap(courses) {
  return Object.fromEntries((courses || []).map((c) => [c.id, c]));
}

/**
 * Build code -> course (includes normalized keys so user input matches)
 * @param {any[]} courses
 */
export function buildCourseCodeMap(courses) {
  const map = {};
  for (const c of courses || []) {
    if (!c?.code) continue;
    const raw = c.code;
    const norm = raw.trim().replace(/\s+/g, " ").toUpperCase();
    map[raw] = c;
    map[norm] = c;
  }
  return map;
}

/**
 * Evaluate a requirement node against completed + takingNow + standing.
 * @param {any} node
 * @param {Set<string>|string[]} completedCourseIds
 * @param {Set<string>|string[]} takingNowIds
 * @param {number} userStanding
 * @param {"PREREQ"|"COREQ"} mode
 */
export function evaluateReq(
  node,
  completedCourseIds,
  takingNowIds = new Set(),
  userStanding = 1,
  mode = "PREREQ"
) {
  if (!node) return true;

  const completed =
    completedCourseIds instanceof Set
      ? completedCourseIds
      : new Set(completedCourseIds || []);

  const takingNow =
    takingNowIds instanceof Set ? takingNowIds : new Set(takingNowIds || []);

  switch (node.kind) {
    case "TRUE":
      return true;

    case "COURSE": {
      const id = node.courseId;
      if (!id) return false;
      const done = completed.has(id);
      if (mode === "PREREQ") return done;
      return done || takingNow.has(id);
    }

    case "STANDING_AT_LEAST":
      return typeof node.minStanding === "number"
        ? userStanding >= node.minStanding
        : true;

    case "AND": {
      const nodes = Array.isArray(node.nodes) ? node.nodes : [];
      return nodes.every((n) =>
        evaluateReq(n, completed, takingNow, userStanding, mode)
      );
    }

    case "OR": {
      const nodes = Array.isArray(node.nodes) ? node.nodes : [];
      return nodes.some((n) =>
        evaluateReq(n, completed, takingNow, userStanding, mode)
      );
    }

    default:
      return false;
  }
}

/**
 * Can the user take `course` given their progress?
 * Keeps your existing calling style working:
 *   canTakeCourse(course, completedSet)
 * and also supports coreqs/takingNow/standing if you later pass them.
 */
export function canTakeCourse(
  course,
  completedCourseIds,
  takingNowIds = new Set(),
  userStanding = 1
) {
  if (!course?.active) return false;

  const completed =
    completedCourseIds instanceof Set
      ? completedCourseIds
      : new Set(completedCourseIds || []);

  const takingNow =
    takingNowIds instanceof Set ? takingNowIds : new Set(takingNowIds || []);

  const prereqOK = !course.prerequisites
    ? true
    : evaluateReq(course.prerequisites, completed, new Set(), userStanding, "PREREQ");

  const coreqOK = !course.corequisites
    ? true
    : evaluateReq(course.corequisites, completed, takingNow, userStanding, "COREQ");

  return prereqOK && coreqOK;
}

/**
 * All prereqs recursively (dependency closure) for highlighting.
 */
export function getAllPrerequisites(courseId, courseMap, visited = new Set()) {
  if (!courseId || visited.has(courseId)) return visited;
  visited.add(courseId);

  const course = courseMap?.[courseId];
  if (!course) return visited;

  for (const pid of getPrerequisiteCourseIds(course)) {
    getAllPrerequisites(pid, courseMap, visited);
  }
  return visited;
}

/**
 * prereqId -> [dependentCourseIds]
 * Used by CourseGraphProcessor.
 */
export function buildAdjacencyList(courses, courseMap) {
  const adjList = Object.fromEntries((courses || []).map((c) => [c.id, []]));

  for (const course of courses || []) {
    const prereqIds = getPrerequisiteCourseIds(course);
    for (const prereqId of prereqIds) {
      if (courseMap?.[prereqId] && adjList[prereqId]) {
        adjList[prereqId].push(course.id);
      }
    }
  }

  return adjList;
}
