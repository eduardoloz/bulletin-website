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
}
