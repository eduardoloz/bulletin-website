import React from 'react';
import { Graph } from 'react-d3-graph';
import courses from '../data/cse.json';

// Custom processor for building a tree layout of courses and placing isolated courses on the top row.
class CourseGraphProcessor {
  constructor(courses) {
    this.courses = courses;
    this.courseMap = {};
    // Build a map from course code to course data.
    courses.forEach(course => {
      // Assume title format "CSE 101: Course Name"
      const code = course.title.split(':')[0].trim();
      this.courseMap[code] = course;
    });

    // Build an adjacency list (prerequisite -> dependent courses).
    this.adjList = {};
    Object.keys(this.courseMap).forEach(code => {
      this.adjList[code] = [];
    });
    courses.forEach(course => {
      const courseCode = course.title.split(':')[0].trim();
      course.prerequisite.forEach(prereq => {
        const prereqCode = prereq.trim();
        if (this.courseMap[prereqCode]) {
          this.adjList[prereqCode].push(courseCode);
        }
      });
    });
  }

  processGraph() {
    // Compute in-degrees for topological sort.
    const inDegree = {};
    Object.keys(this.courseMap).forEach(code => {
      inDegree[code] = 0;
    });
    Object.keys(this.adjList).forEach(prereq => {
      this.adjList[prereq].forEach(dependent => {
        inDegree[dependent]++;
      });
    });

    // Queue for nodes with no prerequisites.
    const queue = [];
    const level = {}; // level (or depth) for each course.
    Object.keys(inDegree).forEach(code => {
      if (inDegree[code] === 0) {
        queue.push(code);
        level[code] = 0;
      }
    });

    // Topological sort and compute level (depth) for each course.
    while (queue.length) {
      const node = queue.shift();
      this.adjList[node].forEach(dependent => {
        inDegree[dependent]--;
        // A course's level is one more than the maximum level of its prerequisites.
        level[dependent] = Math.max(level[dependent] || 0, level[node] + 1);
        if (inDegree[dependent] === 0) {
          queue.push(dependent);
        }
      });
    }

    // Separate courses into isolated (no prereqs and no children) and tree courses.
    const isolatedCodes = [];
    const treeCodes = [];
    Object.keys(this.courseMap).forEach(code => {
      const course = this.courseMap[code];
      // Isolated if it has no prerequisites AND unlocks no other course.
      if (course.prerequisite.length === 0 && this.adjList[code].length === 0) {
        isolatedCodes.push(code);
      } else {
        treeCodes.push(code);
      }
    });

    // For non-isolated (tree) courses, shift their level down by 1
    // so they appear one row below the isolated courses.
    treeCodes.forEach(code => {
      level[code] = (level[code] || 0) + 1;
    });

    // Group courses by level.
    const levelNodes = {};
    // Add isolated courses at level 0.
    if (isolatedCodes.length) {
      levelNodes[0] = [...isolatedCodes];
    }
    // Group tree courses by their (shifted) level.
    treeCodes.forEach(code => {
      const lvl = level[code] || 0;
      if (!levelNodes[lvl]) {
        levelNodes[lvl] = [];
      }
      levelNodes[lvl].push(code);
    });

    // Determine the overall maximum number of nodes in any level
    // for horizontal centering.
    let maxNodesInLevel = 0;
    Object.keys(levelNodes).forEach(lvl => {
      if (levelNodes[lvl].length > maxNodesInLevel) {
        maxNodesInLevel = levelNodes[lvl].length;
      }
    });

    // Layout settings.
    const verticalSpacing = 150;
    const horizontalSpacing = 50; // compact horizontal spacing.
    const nodes = [];

    // For each level, center the nodes horizontally.
    Object.keys(levelNodes).forEach(lvlStr => {
      const lvl = parseInt(lvlStr, 10);
      const codesAtLevel = levelNodes[lvl];
      // Compute offset so that each row is centered relative to the widest row.
      const offset = ((maxNodesInLevel - codesAtLevel.length) * horizontalSpacing) / 2;
      codesAtLevel.forEach((code, index) => {
        nodes.push({
          id: code,
          x: offset + index * horizontalSpacing,
          y: lvl * verticalSpacing
        });
      });
    });

    // Build links: for every course, create a link from each prerequisite to it.
    const links = [];
    this.courses.forEach(course => {
      const courseCode = course.title.split(':')[0].trim();
      course.prerequisite.forEach(prereq => {
        const prereqCode = prereq.trim();
        if (this.courseMap[prereqCode]) {
          links.push({
            source: prereqCode,
            target: courseCode
          });
        }
      });
    });

    return { nodes, links };
  }
}

const CourseGraph = () => {
  // Process the courses and build the graph data.
  const processor = new CourseGraphProcessor(courses);
  const data = processor.processGraph();

  // Graph configuration for react-d3-graph.
  const myConfig = {
    nodeHighlightBehavior: true,
    node: {
      color: 'lightgreen',
      size: 300,
      highlightStrokeColor: 'blue',
      labelProperty: 'id'
    },
    link: {
      highlightColor: 'lightblue',
      renderLabel: true
    },
    directed: true,
    height: 800
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-10">
      <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-10">
        <h2>Course Prerequisites Graph</h2>
        <Graph id="course-graph" data={data} config={myConfig} />
      </div>
    </div>
  );
};

export default CourseGraph;
