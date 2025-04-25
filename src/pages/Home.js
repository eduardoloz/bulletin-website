// Home.js
import React from 'react';
import ProfessorInfo from '../components/NodeInfo'; // Import the ProfessorInfo component
import CourseGraph from '../components/GraphComponent';
import Chatbot from "../components/chatbot";


//import professorInfo to the courseGraph component
function Home() {
  return (

    <div className="home-page">
     
      <div class="grid grid-cols-3 gap-4 shadow-md p-6 border-2 border-gray-300  rounded-lg m-10"> 
      
      <div className="col-span-2 bg-white m-4"> {/* Span 2 columns */}
        <div>
          <CourseGraph /> {/* Render the CourseGraph component */}
          </div>
      </div>

      <div className="col-span-1 bg-white rounded-lg  p-10"> {/* Occupy 1 column */} {/* Render the ProfessorInfo component */}
         <ProfessorInfo />
         <Chatbot />
               </div>

      </div>
     </div>
    
  );
}

export default Home;
