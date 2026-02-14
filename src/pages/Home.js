import React, { useState } from 'react';
import NodeInfo from '../components/NodeInfo'; // previously ProfessorInfo
import CourseGraph from '../components/GraphComponent';
import Legend from '../components/Legend';
import RadialGraphComponent from '../components/RadialGraphComponent';
import majorsList from '../data/majors.json';
// We'll load the selected major's course data dynamically into state

import DegreeProgress1 from '../components/DegreeProgress1';

function Home() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [graphView, setGraphView] = useState('grid'); // 'grid' or 'radial'
  const [selectedMajor, setSelectedMajor] = useState(majorsList?.[0]?.id || 'cse');
  const [coursesData, setCoursesData] = useState([]);

  const handleNodeClick = (courseCode) => {
    // Find course by code (e.g., "CSE 101") within the loaded major data
    const course = (coursesData || []).find(c => c.code === courseCode);
    setSelectedCourse(course);
  };

  // Load courses for the selected major (dynamic import so we can add more majors later)
  React.useEffect(() => {
    let mounted = true;
    const entry = majorsList.find(m => m.id === selectedMajor);
    const file = entry ? entry.data : majorsList[0].data;
    import(`../data/${file}`)
      .then(mod => {
        if (!mounted) return;
        setCoursesData(mod.default || mod);
      })
      .catch(err => {
        console.error('Failed to load major data', err);
        setCoursesData([]);
      });

    return () => { mounted = false; };
  }, [selectedMajor]);

  return (
    <div className="home-page">
      <div className="grid grid-cols-3 gap-1 shadow-md p-6 border-2 border-gray-300 rounded-lg m-10">

        <div className="col-span-2 bg-white m-4 p-4 rounded-lg shadow-sm">
          {/* Graph View & Major Selector */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-end md:gap-6">
              {/* Graph View Selector */}
              <div className="flex-1 mb-4 md:mb-0">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Graph View
                </label>
                <select
                  value={graphView}
                  onChange={(e) => setGraphView(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition"
                >
                  <option value="grid">Grid Layout</option>
                  <option value="radial">Radial Tree</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {graphView === 'grid'
                    ? 'Traditional grid layout with force-directed positioning'
                    : 'Radial tree layout showing hierarchical course structure'}
                </p>
              </div>

              {/* Major Selector */}
              <div className="flex-1 mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Major
                </label>
                <select
                  value={selectedMajor}
                  onChange={(e) => setSelectedMajor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition"
                >
                  {majorsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Render selected graph view */}
          {graphView === 'grid' ? (
            <CourseGraph onNodeClick={handleNodeClick} courses={coursesData} />
          ) : (
            <RadialGraphComponent onNodeClick={handleNodeClick} courses={coursesData} />
          )}
        </div>

























        <div className="col-span-1 bg-white rounded-lg p-3">
          <NodeInfo course={selectedCourse} courses={coursesData} />
          {/* <Chatbot selectedMajor={selectedMajor} /> */}
          <Legend />
        </div>

      </div>
      <DegreeProgress1 />

    </div>
  );
}

export default Home;


