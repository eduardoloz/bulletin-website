// CourseGraphProcessor.js
import {
  buildCourseMap,
  buildAdjacencyList,
  getPrerequisiteCourseIds
} from '../utils/courseUtils';

export default class CourseGraphProcessor {
  constructor(
    courses,
    { verticalSpacing = 150, horizontalSpacing = 120 } = {}
  ) {
    this.courses = courses;
    this.verticalSpacing = verticalSpacing;
    this.horizontalSpacing = horizontalSpacing;

    /* ----- build helper maps ----- */
    // Map by course ID (uuid)
    this.courseMap = buildCourseMap(courses);

    // Adjacency list: prerequisite ID → dependent course IDs
    this.adjList = buildAdjacencyList(courses, this.courseMap);
  }

  processGraph() {
    /* ---------- topological sort to find each course's depth ---------- */
    const inDeg = Object.fromEntries(
      this.courses.map(c => [c.id, 0])
    );

    // Count incoming edges
    Object.values(this.adjList).forEach(dependents =>
      dependents.forEach(depId => (inDeg[depId] = (inDeg[depId] || 0) + 1))
    );

    const queue = [];
    const level = {};

    // Start with courses that have no prerequisites
    Object.entries(inDeg).forEach(([courseId, degree]) => {
      if (degree === 0) {
        queue.push(courseId);
        level[courseId] = 0;
      }
    });

    // Process queue
    while (queue.length) {
      const courseId = queue.shift();
      this.adjList[courseId].forEach(dependentId => {
        inDeg[dependentId] -= 1;
        level[dependentId] = Math.max(
          level[dependentId] ?? 0,
          (level[courseId] ?? 0) + 1
        );
        if (inDeg[dependentId] === 0) queue.push(dependentId);
      });
    }

    /* ---------- separate isolated courses from tree ---------- */
    const isolated = [];
    const tree = [];

    this.courses.forEach(course => {
      const prereqIds = getPrerequisiteCourseIds(course);
      const dependents = this.adjList[course.id] || [];

      if (prereqIds.length === 0 && dependents.length === 0) {
        isolated.push(course.id);
      } else {
        tree.push(course.id);
      }
    });

    // Shift tree courses down by 1 level to make room for isolated courses
    tree.forEach(courseId => {
      level[courseId] = (level[courseId] ?? 0) + 1;
    });

    /* ---------- group courses by level ---------- */
    const levelNodes = {};
    if (isolated.length) levelNodes[0] = isolated;

    tree.forEach(courseId => {
      const lvl = level[courseId];
      if (!levelNodes[lvl]) levelNodes[lvl] = [];
      levelNodes[lvl].push(courseId);
    });

    /* ---------- compute grid coordinates ---------- */
    const maxNodes = Math.max(...Object.values(levelNodes).map(arr => arr.length));
    const maxRowWidth = (maxNodes - 1) * this.horizontalSpacing;

    const nodes = [];
    Object.entries(levelNodes).forEach(([levelStr, courseIds]) => {
      const lvl = parseInt(levelStr);
      const rowWidth = (courseIds.length - 1) * this.horizontalSpacing;
      const startX = (maxRowWidth - rowWidth) / 2; // center the row
      const y = lvl * this.verticalSpacing;

      courseIds.forEach((courseId, i) => {
        const course = this.courseMap[courseId];
        nodes.push({
          id: courseId,
          code: course.code,
          name: course.code,
          x: startX + i * this.horizontalSpacing,
          y
        });
      });
    });

    /* ---------- build links ---------- */
    const links = [];
    this.courses.forEach(course => {
      const prereqIds = getPrerequisiteCourseIds(course);
      prereqIds.forEach(prereqId => {
        if (this.courseMap[prereqId]) {
          links.push({ source: prereqId, target: course.id });
        }
      });
    });

    return { nodes, links };
  }

  processRadialGraph() {
    /* ---------- Calculate depth for radial layout ---------- */
    const depths = {};
    const visited = new Set();
    const courseMap = this.courseMap;

    const calculateDepth = (courseId) => {
      if (visited.has(courseId)) return depths[courseId] || 0;
      visited.add(courseId);

      const course = courseMap[courseId];
      if (!course) return 0;

      const prereqIds = getPrerequisiteCourseIds(course);

      // Entry-level courses (no prerequisites)
      if (prereqIds.length === 0) {
        // Put true entry-level CSE courses in the center
        const entryLevelNumbers = ['101', '102', '110', '113', '114', '130', '150'];
        if (course.deptCode === 'CSE' && entryLevelNumbers.includes(course.number)) {
          depths[courseId] = 0;
          return 0;
        } else {
          // Other courses with no prereqs go to depth 1
          depths[courseId] = 1;
          return 1;
        }
      }

      // Filter out prerequisites that don't exist in courseMap
      const validPrereqIds = prereqIds.filter(prereqId => courseMap[prereqId]);

      if (validPrereqIds.length === 0) {
        depths[courseId] = 1;
        return 1;
      }

      // Depth is max prereq depth + 1
      const maxPrereqDepth = Math.max(...validPrereqIds.map(prereqId =>
        calculateDepth(prereqId)
      ));
      depths[courseId] = maxPrereqDepth + 1;
      return depths[courseId];
    };

    // Calculate depths for all courses
    this.courses.forEach(course => calculateDepth(course.id));

    // Group courses by depth
    const coursesByDepth = {};
    Object.entries(depths).forEach(([courseId, depth]) => {
      if (!coursesByDepth[depth]) coursesByDepth[depth] = [];
      coursesByDepth[depth].push(courseId);
    });

    const radiusStep = 120; // Distance between rings
    const centerX = 0;
    const centerY = 0;

    /* ---------- Create nodes with radial positioning ---------- */
    const nodes = [];
    const links = [];

    Object.entries(coursesByDepth).forEach(([depthStr, courseIds]) => {
      const depth = parseInt(depthStr);
      const radius = depth * radiusStep + 80; // Start at radius 80
      const angleStep = (2 * Math.PI) / courseIds.length;

      courseIds.forEach((courseId, index) => {
        const course = courseMap[courseId];
        if (!course) return;

        const angle = index * angleStep - Math.PI / 2; // Start at top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        nodes.push({
          id: courseId,
          code: course.code,
          name: course.code,
          x: x,
          y: y,
          depth: depth,
          fullName: course.title
        });
      });
    });

    /* ---------- Create links ---------- */
    this.courses.forEach(course => {
      const prereqIds = getPrerequisiteCourseIds(course);
      prereqIds.forEach(prereqId => {
        if (courseMap[prereqId]) {
          links.push({ source: prereqId, target: course.id });
        }
      });
    });

    // Convert string references to actual node objects for D3
    const linkObjects = links.map(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      if (sourceNode && targetNode) {
        return { source: sourceNode, target: targetNode };
      }
      return null;
    }).filter(Boolean);

    return { nodes, links: linkObjects };
  }
}
