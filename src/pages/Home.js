// Home.js
import React, { useState } from 'react';
import CourseGraph from '../components/GraphComponent';
import CourseInfo from '../components/CourseInfo';
import Chatbot from '../components/chatbot';
import courses from '../data/cse.json';

export default function Home() {
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleNodeClick = (nodeId) => {
    const course = courses.find(c => c.title.startsWith(nodeId));
    setSelectedCourse(course);
  };

  return (
    <div className="grid grid-cols-3 gap-4 shadow-md p-6 border rounded-lg m-10">
      <div className="col-span-2 bg-white p-4 rounded-lg">
        <CourseGraph onNodeClick={handleNodeClick} />
      </div>
      <div className="col-span-1 space-y-4">
        <CourseInfo course={selectedCourse} />
        <Chatbot />
      </div>
    </div>
  );
}
