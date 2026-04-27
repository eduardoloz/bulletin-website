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

  processGraph(primaryDept = null) {
    /* ---------- split major vs external courses ---------- */
    const majorCourses = primaryDept
      ? this.courses.filter(c => c.deptCode === primaryDept)
      : this.courses;
    const externalCourses = primaryDept
      ? this.courses.filter(c => c.deptCode !== primaryDept)
      : [];

    const majorIds = new Set(majorCourses.map(c => c.id));

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

    /* ---------- separate isolated major courses from tree ---------- */
    const isolated = [];
    const tree = [];

    majorCourses.forEach(course => {
      const prereqIds = getPrerequisiteCourseIds(course);
      const dependents = this.adjList[course.id] || [];
      // Only count connections within the major for isolated check
      const majorPrereqs = prereqIds.filter(pid => majorIds.has(pid));
      const majorDependents = dependents.filter(did => majorIds.has(did));

      if (majorPrereqs.length === 0 && majorDependents.length === 0) {
        isolated.push(course.id);
      } else {
        tree.push(course.id);
      }
    });

    // Shift tree courses down by 1 level to make room for isolated courses
    tree.forEach(courseId => {
      level[courseId] = (level[courseId] ?? 0) + 1;
    });

    /* ---------- group major courses by level ---------- */
    const levelNodes = {};
    if (isolated.length) levelNodes[0] = isolated;

    tree.forEach(courseId => {
      const lvl = level[courseId];
      if (!levelNodes[lvl]) levelNodes[lvl] = [];
      levelNodes[lvl].push(courseId);
    });

    /* ---------- compute grid coordinates for major courses ---------- */
    const maxNodes = Math.max(1, ...Object.values(levelNodes).map(arr => arr.length));
    const maxRowWidth = (maxNodes - 1) * this.horizontalSpacing;

    const nodes = [];
    let maxY = 0;
    Object.entries(levelNodes).forEach(([levelStr, courseIds]) => {
      const lvl = parseInt(levelStr);
      const rowWidth = (courseIds.length - 1) * this.horizontalSpacing;
      const startX = (maxRowWidth - rowWidth) / 2; // center the row
      const y = lvl * this.verticalSpacing;
      if (y > maxY) maxY = y;

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

    /* ---------- place external courses in a separate section below ---------- */
    if (externalCourses.length > 0) {
      // Group external courses by department
      const extByDept = {};
      externalCourses.forEach(course => {
        const dept = course.deptCode || 'OTHER';
        if (!extByDept[dept]) extByDept[dept] = [];
        extByDept[dept].push(course);
      });

      // Sort each department's courses by number
      Object.values(extByDept).forEach(arr =>
        arr.sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0))
      );

      const deptKeys = Object.keys(extByDept).sort();
      const gapBelow = this.verticalSpacing * 1.5; // gap between major and external
      let extY = maxY + gapBelow;

      deptKeys.forEach(dept => {
        const deptCourses = extByDept[dept];
        const rowWidth = (deptCourses.length - 1) * this.horizontalSpacing;
        const startX = (maxRowWidth - rowWidth) / 2;

        deptCourses.forEach((course, i) => {
          nodes.push({
            id: course.id,
            code: course.code,
            name: course.code,
            x: startX + i * this.horizontalSpacing,
            y: extY,
            isExternal: true,
          });
        });

        extY += this.verticalSpacing;
      });
    }

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

  /**
   * Layout by course level (100s, 200s, 300s, 400s, 500+).
   * Within each row, courses are sorted by number.
   * Prereq arrows still connect across rows.
   */
  processCourseLevelGraph() {
    /* ---------- group by course level ---------- */
    const levelBuckets = {}; // e.g. 1 => [courses with 1xx numbers]

    this.courses.forEach(course => {
      const num = parseInt(course.number, 10);
      const bucket = isNaN(num) ? 0 : Math.floor(num / 100);
      if (!levelBuckets[bucket]) levelBuckets[bucket] = [];
      levelBuckets[bucket].push(course);
    });

    // Sort buckets by level, sort courses within each bucket by number
    const sortedLevels = Object.keys(levelBuckets)
      .map(Number)
      .sort((a, b) => a - b);

    sortedLevels.forEach(lvl => {
      levelBuckets[lvl].sort((a, b) => {
        const numA = parseInt(a.number, 10) || 0;
        const numB = parseInt(b.number, 10) || 0;
        return numA - numB;
      });
    });

    /* ---------- compute grid coordinates ---------- */
    const maxPerRow = Math.max(...sortedLevels.map(lvl => levelBuckets[lvl].length));
    const maxRowWidth = (maxPerRow - 1) * this.horizontalSpacing;

    const nodes = [];
    sortedLevels.forEach((lvl, rowIndex) => {
      const coursesInRow = levelBuckets[lvl];
      const rowWidth = (coursesInRow.length - 1) * this.horizontalSpacing;
      const startX = (maxRowWidth - rowWidth) / 2;
      const y = rowIndex * this.verticalSpacing;

      coursesInRow.forEach((course, i) => {
        nodes.push({
          id: course.id,
          code: course.code,
          name: course.code,
          level: lvl,
          x: startX + i * this.horizontalSpacing,
          y,
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
