import React from 'react';
import { Graph } from 'react-d3-graph';
import courses from '../data/cse.json';

// Custom class to process course data
class CourseGraphProcessor {
  constructor(courses) {
    this.courses = courses;
    this.courseMap = {};
    // Build a map from course code to course object.
    courses.forEach((course) => {
      // Assume title format "CSE 101: Course Name"
      const code = course.title.split(':')[0].trim();
      this.courseMap[code] = course;
    });

    // Build an adjacency list for courses: prerequisite -> dependent courses.
    this.adjList = {};
    Object.keys(this.courseMap).forEach((code) => {
      this.adjList[code] = [];
    });
    courses.forEach((course) => {
      const courseCode = course.title.split(':')[0].trim();
      course.prerequisite.forEach((prereq) => {
        const prereqCode = prereq.trim();
        if (this.courseMap[prereqCode]) {
          // This means taking prereq unlocks courseCode.
          this.adjList[prereqCode].push(courseCode);
        }
      });
    });
  }

  // Process the graph data: perform topological sort to determine levels,
  // assign positions, and build nodes and links.
  processGraph() {
    // Compute in-degrees for each course.
    const inDegree = {};
    Object.keys(this.courseMap).forEach((code) => {
      inDegree[code] = 0;
    });
    Object.keys(this.adjList).forEach((prereq) => {
      this.adjList[prereq].forEach((dependent) => {
        inDegree[dependent]++;
      });
    });

    // Queue for nodes with in-degree 0.
    const queue = [];
    const level = {}; // store level (depth) for each course
    Object.keys(inDegree).forEach((code) => {
      if (inDegree[code] === 0) {
        queue.push(code);
        level[code] = 0;
      }
    });

    // Perform topological sort and compute levels.
    while (queue.length) {
      const node = queue.shift();
      this.adjList[node].forEach((dependent) => {
        inDegree[dependent]--;
        // The level of the dependent is at least one more than this node.
        level[dependent] = Math.max(level[dependent] || 0, level[node] + 1);
        if (inDegree[dependent] === 0) {
          queue.push(dependent);
        }
      });
    }

    // Group courses by level for layout purposes.
    const levelNodes = {};
    Object.keys(this.courseMap).forEach((code) => {
      const lvl = level[code] || 0;
      if (!levelNodes[lvl]) {
        levelNodes[lvl] = [];
      }
      levelNodes[lvl].push(code);
    });

    // Assign positions: x based on index in the level, y based on level.
    const verticalSpacing = 150;
    const horizontalSpacing = 200;
    const nodes = [];
    Object.keys(levelNodes).forEach((lvlStr) => {
      const lvl = parseInt(lvlStr, 10);
      const codesAtLevel = levelNodes[lvl];
      codesAtLevel.forEach((code, index) => {
        nodes.push({ id: code, x: index * horizontalSpacing, y: lvl * verticalSpacing });
      });
    });

    // Build links: for every course, create an edge from each prerequisite (if available) to the course.
    const links = [];
    this.courses.forEach((course) => {
      const courseCode = course.title.split(':')[0].trim();
      course.prerequisite.forEach((prereq) => {
        const prereqCode = prereq.trim();
        if (this.courseMap[prereqCode]) {
          links.push({ source: prereqCode, target: courseCode });
        }
      });
    });

    return { nodes, links };
  }
}

const CourseGraph = () => {
  // Create an instance of our custom processor and process the courses.
  const processor = new CourseGraphProcessor(courses);
  const data = processor.processGraph();

  // Configuration for react-d3-graph.
  const myConfig = {
    nodeHighlightBehavior: true,
    node: {
      color: 'lightgreen',
      size: 300,
      highlightStrokeColor: 'blue',
      labelProperty: 'id',
    },
    link: {
      highlightColor: 'lightblue',
      renderLabel: true,
    },
    // Directed: arrows will point from prerequisites to the course that is unlocked.
    directed: true,
    height: 800,
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
