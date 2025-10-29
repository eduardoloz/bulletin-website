import React, { useState } from 'react';
import NodeInfo from '../components/NodeInfo'; // previously ProfessorInfo
import CourseGraph from '../components/GraphComponent';
import Legend from '../components/Legend';
import Chatbot from "../components/chatbot";
import courses from '../data/cse.json';

function Home() {
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleNodeClick = (id) => {
    const course = courses.find(c => c.title.startsWith(id));
    setSelectedCourse(course);
  };

  return (
    <div className="home-page">
      <div className="grid grid-cols-3 gap-1 shadow-md p-6 border-2 border-gray-300 rounded-lg m-10">
        
        <div className="col-span-2 bg-white m-4">
          <Legend />
        </div>

        <div className="col-span-2 bg-white m-4">
          <CourseGraph onNodeClick={handleNodeClick} />
        </div>

        <div className="col-span-1 bg-white rounded-lg p-3">
          <NodeInfo course={selectedCourse} />
          <Chatbot />
        </div>

      </div>
    </div>
  );
}

export default Home;
