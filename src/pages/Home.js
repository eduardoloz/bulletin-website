import React, { useState } from 'react';
import NodeInfo from '../components/NodeInfo'; // previously ProfessorInfo
import CourseGraph from '../components/GraphComponent';
import Legend from '../components/Legend';
import RadialGraphComponent from '../components/RadialGraphComponent';
import Chatbot from "../components/chatbot";
import courses from '../data/sbu_cse_courses_new_schema.json';

import DegreeProgress1 from '../components/DegreeProgress1';

function Home() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [graphView, setGraphView] = useState('grid'); // 'grid' or 'radial'

  const handleNodeClick = (courseCode) => {
    // Find course by code (e.g., "CSE 101")
    const course = courses.find(c => c.code === courseCode);
    setSelectedCourse(course);
  };

  return (
    <div className="home-page">
      <div className="grid grid-cols-3 gap-1 shadow-md p-6 border-2 border-gray-300 rounded-lg m-10">
        
      

        <div className="col-span-2 bg-white m-4">
          {/* Graph View Selector */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Graph View:
            </label>
            <select
              value={graphView}
              onChange={(e) => setGraphView(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="grid">Grid Layout</option>
              <option value="radial">Radial Tree</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {graphView === 'grid' 
                ? 'Traditional grid layout with force-directed positioning'
                : 'Radial tree layout showing hierarchical course structure'
              }
            </p>
          </div>

          {/* Render selected graph view */}
          {graphView === 'grid' ? (
            <CourseGraph onNodeClick={handleNodeClick} />
          ) : (
            <RadialGraphComponent onNodeClick={handleNodeClick} />
          )}
        </div>

        <div className="col-span-1 bg-white rounded-lg p-3">
          <NodeInfo course={selectedCourse} />
          <Chatbot />
          <Legend />
        </div>

      </div>
      <DegreeProgress1 />

    </div>
  );
}

export default Home;
