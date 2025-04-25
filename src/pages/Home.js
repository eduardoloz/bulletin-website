// Home.js
import React from 'react';
import ProfessorInfo from '../components/NodeInfo'; // Import the ProfessorInfo component
import CourseGraph from '../components/GraphComponent';

//import professorInfo to the courseGraph component
function Home() {
  return (
    <div className="home-page">
      <div class="grid grid-cols-4">


      <CourseGraph /> {/* Render the CourseGraph component */}
      <ProfessorInfo /> {/* Render the ProfessorInfo component */}
    </div>
    </div>
  );
}

export default Home;
