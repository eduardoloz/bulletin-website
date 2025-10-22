// CourseGraphProcessor.js
export default class CourseGraphProcessor {
  constructor(
    courses,
    { verticalSpacing = 150, horizontalSpacing = 120 } = {}
  ) {
    this.courses = courses;
    this.verticalSpacing = verticalSpacing;
    this.horizontalSpacing = horizontalSpacing;

    /* ----- build helper maps ----- */
    this.courseMap = Object.fromEntries(
      courses.map(c => [c.title.split(':')[0].trim(), c])
    );

    // adjacency list: prereq → dependants
    this.adjList = Object.fromEntries(
      Object.keys(this.courseMap).map(c => [c, []])
    );
    courses.forEach(({ title, prerequisite }) => {
      const code = title.split(':')[0].trim();
      prerequisite.forEach(p => {
        const pCode = p.trim();
        if (this.courseMap[pCode]) this.adjList[pCode].push(code);
      });
    });
  }

  processGraph() {
    /* ---------- topo‐sort to find each course’s depth ---------- */
    const inDeg = Object.fromEntries(
      Object.keys(this.courseMap).map(c => [c, 0])
    );
    Object.values(this.adjList).forEach(list =>
      list.forEach(t => (inDeg[t] += 1))
    );

    const q = [];
    const level = {};
    Object.entries(inDeg).forEach(([c, d]) => {
      if (d === 0) {
        q.push(c);
        level[c] = 0;
      }
    });

    while (q.length) {
      const v = q.shift();
      this.adjList[v].forEach(w => {
        inDeg[w] -= 1;
        level[w] = Math.max(level[w] ?? 0, (level[v] ?? 0) + 1);
        if (inDeg[w] === 0) q.push(w);
      });
    }

    /* ---------- gather nodes by level (isolated row 0) ---------- */
    const iso = [];
    const tree = [];
    Object.keys(this.courseMap).forEach(c => {
      if (
        this.courseMap[c].prerequisite.length === 0 &&
        this.adjList[c].length === 0
      )
        iso.push(c);
      else tree.push(c);
    });

    tree.forEach(c => (level[c] += 1)); // shift tree rows down

    const levelNodes = {};
    if (iso.length) levelNodes[0] = iso;
    tree.forEach(c => {
      levelNodes[level[c]] = (levelNodes[level[c]] || []).concat(c);
    });

    /* ---------- compute grid coordinates ---------- */
    const maxNodes = Math.max(...Object.values(levelNodes).map(a => a.length));
    const maxRowW  = (maxNodes - 1) * this.horizontalSpacing;

    const nodes = [];
    Object.entries(levelNodes).forEach(([lvlStr, codes]) => {
      const lvl      = +lvlStr;
      const rowW     = (codes.length - 1) * this.horizontalSpacing;
      const startX   = (maxRowW - rowW) / 2;          // centre row
      const y        = lvl * this.verticalSpacing;

      codes.forEach((code, i) =>
        nodes.push({ id: code, x: startX + i * this.horizontalSpacing, y })
      );
    });

    /* ---------- build links ---------- */
    const links = [];
    this.courses.forEach(({ title, prerequisite }) => {
      const tgt = title.split(':')[0].trim();
      prerequisite.forEach(p => {
        const src = p.trim();
        if (this.courseMap[src]) links.push({ source: src, target: tgt });
      });
    });

    return { nodes, links };
  }

  processRadialGraph() {
    /* ---------- Simple radial layout based on prerequisite depth ---------- */
    const courseMap = this.courseMap;

    // Calculate depth for each course (how many prerequisites deep)
    const depths = {};
    const visited = new Set();

    const calculateDepth = (courseId) => {
      if (visited.has(courseId)) return depths[courseId] || 0;
      visited.add(courseId);

      const course = courseMap[courseId];
      if (!course || course.prerequisite.length === 0) {
        // Only put truly entry-level courses in the center (CSE 101, 102, 110, 113, 114)
        const entryLevelCourses = ['CSE 101', 'CSE 102', 'CSE 110', 'CSE 113', 'CSE 114'];
        if (entryLevelCourses.includes(courseId)) {
          depths[courseId] = 0;
          return 0;
        } else {
          // Other courses with no prerequisites go to depth 1
          depths[courseId] = 1;
          return 1;
        }
      }

      // Filter out prerequisites that don't exist in courseMap
      const validPrereqs = course.prerequisite.filter(prereq =>
        courseMap[prereq.trim()]
      );

      if (validPrereqs.length === 0) {
        depths[courseId] = 1;
        return 1;
      }

      const maxPrereqDepth = Math.max(...validPrereqs.map(prereq =>
        calculateDepth(prereq.trim())
      ));
      depths[courseId] = maxPrereqDepth + 1;
      return depths[courseId];
    };

    // Calculate depths for all courses
    Object.keys(courseMap).forEach(courseId => calculateDepth(courseId));

    // Group courses by depth
    const coursesByDepth = {};
    Object.entries(depths).forEach(([courseId, depth]) => {
      if (!coursesByDepth[depth]) coursesByDepth[depth] = [];
      coursesByDepth[depth].push(courseId);
    });

    const maxDepth = Math.max(...Object.keys(coursesByDepth).map(Number));
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
        if (!course) {
          return; // Skip if course doesn't exist
        }

        const angle = index * angleStep - Math.PI / 2; // Start at top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const node = {
          id: courseId,
          x: x,
          y: y,
          depth: depth,
          name: course.title.split(':')[0].trim(),
          fullName: course.title
        };

        nodes.push(node);
      });
    });

    /* ---------- Create links ---------- */
    this.courses.forEach(({ title, prerequisite }) => {
      const targetId = title.split(':')[0].trim();
      prerequisite.forEach(prereq => {
        const sourceId = prereq.trim();
        if (courseMap[sourceId]) {
          links.push({ source: sourceId, target: targetId });
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
