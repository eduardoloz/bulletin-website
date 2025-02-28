// CourseGraph.js
import React, { useState } from 'react';
import { Graph } from 'react-d3-graph';
import courses from '../data/cse.json';
import CourseGraphProcessor from './CourseGraphProcessor'; // Adjust the path as needed

const CourseGraph = () => {
  // Process the courses and build the graph data.
  const processor = new CourseGraphProcessor(courses);
  const [completedCourses, setCompletedCourses] = useState(new Set());
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [mode, setMode] = useState('default'); // Modes: 'completed', 'prereqs', 'future'
  const [futureMode, setFutureMode] = useState(false);



  const data = processor.processGraph();

  const toggleCompleted = (courseId) =>{
    setCompletedCourses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const resetGraph = () => {
    setCompletedCourses(new Set());
    setSelectedCourse(null);
    setMode('default');
  };

  const getAllPrerequisites = (courseId, visited = new Set()) => {
    if (visited.has(courseId)) return;
    visited.add(courseId);
    const prerequisites = processor.courseMap[courseId]?.prerequisite || [];
    prerequisites.forEach((prereq) => getAllPrerequisites(prereq, visited));
    return visited;
  };

  const getNodeColor = (nodeId) => {
    if (mode === 'completed') {
      if (completedCourses.has(nodeId)) return 'green';
      
      const unlocked = new Set();
      data.links.forEach((link) => {
        if (completedCourses.has(link.source)) {
          unlocked.add(link.target);
        }
      });
      
      if (unlocked.has(nodeId)) {
        return 'blue';
      }
      
      if (futureMode) {
        const futureUnlocks = new Set();
        data.links.forEach((link) => {
          if (unlocked.has(link.source)) {
            futureUnlocks.add(link.target);
          }
        });
        return futureUnlocks.has(nodeId) ? 'purple' : 'grey';
      }
      
      return 'grey';
    } else if (mode === 'prereqs' && selectedCourse) {
      const allPrereqs = getAllPrerequisites(selectedCourse) || new Set();
      return allPrereqs.has(nodeId) ? 'orange' : 'lightgrey';
    }
    return 'lightgreen';
  };


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
        <div className="text-lg font-semibold my-2">Current Mode: <span className="text-blue-500">{mode === 'completed' ? (futureMode ? 'Completed + Future Mode' : 'Completed Mode') : mode === 'prereqs' ? 'Prereqs Mode' : 'Default Mode'}</span></div>
        <div className="flex space-x-4 my-4">
          <button onClick={() => setMode('completed')} className={`px-4 py-2 ${mode === 'completed' ? 'bg-green-700' : 'bg-green-500'} text-white rounded`}>Completed Mode</button>
          {mode === 'completed' && (
            <button onClick={() => setFutureMode((prev) => !prev)} className={`px-4 py-2 ${futureMode ? 'bg-purple-700' : 'bg-purple-500'} text-white rounded`}>Future Mode</button>
          )}
          <button onClick={() => setMode('prereqs')} className={`px-4 py-2 ${mode === 'prereqs' ? 'bg-orange-700' : 'bg-orange-500'} text-white rounded`}>Prereqs Mode</button>
          <button onClick={resetGraph} className="px-4 py-2 bg-red-500 text-white rounded">Reset</button>
        </div>
        <Graph
          id="course-graph"
          data={{
            nodes: data.nodes.map((node) => ({ ...node, color: getNodeColor(node.id) })),
            links: data.links,
          }}
          config={myConfig}
          onClickNode={(nodeId) => {
            if (mode === 'completed') toggleCompleted(nodeId);
            else setSelectedCourse(nodeId);
          }}
        />
      </div>
    </div>
  );
};


export default CourseGraph;
