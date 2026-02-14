/**
 * Utility functions for working with course data in the new schema format
 */

/**
 * Recursively extract all course IDs from a prerequisite/corequisite tree
 * @param {ReqNode} node - The requirement node to traverse
 * @returns {string[]} Array of course IDs
 */
export function extractCourseIds(node) {
  if (!node) return [];

  switch (node.kind) {
    case 'TRUE':
      return [];
    case 'COURSE':
      return [node.courseId];
    case 'AND':
    case 'OR':
      return node.nodes.flatMap(n => extractCourseIds(n));
    case 'STANDING_AT_LEAST':
      return [];
    default:
      return [];
  }
}

/**
 * Get all direct prerequisite course IDs for a course
 * @param {Course} course - The course object
 * @returns {string[]} Array of prerequisite course IDs
 */
export function getPrerequisiteCourseIds(course) {
  if (!course?.prerequisites) return [];
  return extractCourseIds(course.prerequisites);
}

/**
 * Get all direct corequisite course IDs for a course
 * @param {Course} course - The course object
 * @returns {string[]} Array of corequisite course IDs
 */
export function getCorequisiteCourseIds(course) {
  if (!course?.corequisites) return [];
  return extractCourseIds(course.corequisites);
}

/**
 * Build a course map from array (id -> course)
 * @param {Course[]} courses - Array of courses
 * @returns {Object} Map of course ID to course object
 */
export function buildCourseMap(courses) {
  return Object.fromEntries(courses.map(c => [c.id, c]));
}

/**
 * Build a course code map from array (code -> course)
 * @param {Course[]} courses - Array of courses
 * @returns {Object} Map of course code to course object
 */
export function buildCourseCodeMap(courses) {
  return Object.fromEntries(courses.map(c => [c.code, c]));
}

/**
 * Evaluate a requirement node against a user's completed and current courses
 * @param {ReqNode} node - The requirement node to evaluate
 * @param {Set<string>} completedCourseIds - Set of completed course IDs
 * @param {Set<string>} takingNowIds - Set of course IDs currently being taken
 * @param {number} userStanding - User's current standing (for STANDING_AT_LEAST)
 * @param {string} mode - 'PREREQ' or 'COREQ'
 * @returns {boolean} Whether the requirement is satisfied
 */
export function evaluateReq(node, completedCourseIds, takingNowIds = new Set(), userStanding = 1, mode = 'PREREQ') {
  if (!node) return true;

  switch (node.kind) {
    case 'TRUE':
      return true;

    case 'COURSE': {
      const done = completedCourseIds.has(node.courseId);
      if (mode === 'PREREQ') return done;
      return done || takingNowIds.has(node.courseId);
    }

    case 'STANDING_AT_LEAST':
      return userStanding >= node.minStanding;

    case 'AND':
      return node.nodes.every(n => evaluateReq(n, completedCourseIds, takingNowIds, userStanding, mode));

    case 'OR':
      return node.nodes.some(n => evaluateReq(n, completedCourseIds, takingNowIds, userStanding, mode));

    default:
      return false;
  }
}

/**
 * Check if a user can take a course given their completed courses and current enrollment
 * @param {Course} course - The course to check
 * @param {Set<string>} completedCourseIds - Set of completed course IDs
 * @param {Set<string>} takingNowIds - Set of course IDs currently being taken
 * @param {number} userStanding - User's current standing
 * @returns {boolean} Whether the user can take the course
 */
export function canTakeCourse(course, completedCourseIds, takingNowIds = new Set(), userStanding = 1) {
  if (!course?.active) return false;

  const prereqOK = !course.prerequisites
    ? true
    : evaluateReq(course.prerequisites, completedCourseIds, new Set(), userStanding, 'PREREQ');

  const coreqOK = !course.corequisites
    ? true
    : evaluateReq(course.corequisites, completedCourseIds, takingNowIds, userStanding, 'COREQ');

  return prereqOK && coreqOK;
}

/**
 * Get all prerequisite course IDs recursively (entire dependency tree)
 * @param {string} courseId - The course ID to start from
 * @param {Object} courseMap - Map of course ID to course object
 * @param {Set<string>} visited - Set to track visited courses (prevents cycles)
 * @returns {Set<string>} Set of all prerequisite course IDs
 */
export function getAllPrerequisites(courseId, courseMap, visited = new Set()) {
  if (visited.has(courseId)) return visited;
  visited.add(courseId);

  const course = courseMap[courseId];
  if (!course) return visited;

  const directPrereqs = getPrerequisiteCourseIds(course);
  directPrereqs.forEach(prereqId => {
    getAllPrerequisites(prereqId, courseMap, visited);
  });

  return visited;
}

/**
 * Build adjacency list for the course graph (prereq -> dependents)
 * @param {Course[]} courses - Array of courses
 * @param {Object} courseMap - Map of course ID to course object
 * @returns {Object} Adjacency list mapping prerequisite IDs to dependent course IDs
 */
export function buildAdjacencyList(courses, courseMap) {
  const adjList = Object.fromEntries(
    courses.map(c => [c.id, []])
  );

  courses.forEach(course => {
    const prereqIds = getPrerequisiteCourseIds(course);
    prereqIds.forEach(prereqId => {
      if (courseMap[prereqId] && adjList[prereqId]) {
        adjList[prereqId].push(course.id);
      }
    });
  });

  return adjList;
}

/**
 * Convert requirement tree to human-readable string
 * @param {ReqNode} node - The requirement node
 * @param {Object} courseCodeMap - Map of course ID to course code
 * @returns {string} Human-readable requirement string
 */
export function reqToString(node, courseCodeMap) {
  if (!node) return 'None';

  switch (node.kind) {
    case 'TRUE':
      return 'None';

    case 'COURSE': {
      const course = courseCodeMap[node.courseId];
      return course ? course.code : node.courseId;
    }

    case 'STANDING_AT_LEAST':
      return `Standing ${node.minStanding}+`;

    case 'AND':
      return `(${node.nodes.map(n => reqToString(n, courseCodeMap)).join(' AND ')})`;

    case 'OR':
      return `(${node.nodes.map(n => reqToString(n, courseCodeMap)).join(' OR ')})`;

    default:
      return 'Unknown';
  }
}
