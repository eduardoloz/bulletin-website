// import React from 'react';
// // Assuming '../data/GroupPhoto.png' is correctly located relative to this file
// // and your build process handles image imports.
// import groupPhoto from '../data/GroupPhoto.png';

// function DegreeProgress1() {
//   const members = [
//     {
//       name: "Karina Lam",
//       linkedIn: "https://www.linkedin.com/in/karina-lam-767a93248/", // Replace with actual LinkedIn profile URLs
//       github: "https://github.com/klam118"    // Replace with actual GitHub profile URLs
//     },
//     {
//       name: "Samantha Li",
//       linkedIn: "https://www.linkedin.com/in/samanthali01/",
//       github: "https://github.com/sli012"
//     },
//     {
//       name: "Brandon Moy",
//       linkedIn: "https://www.linkedin.com/in/brandon-moy-495a65278/",
//       github: "https://github.com/Btmoy1122"
//     },
//     {
//       name: "Timothy Sit",
//       linkedIn: "https://www.linkedin.com/in/tim-sit/",
//       github: "https://github.com/T-lang3"
//     },
//     {
//       name: "Eduardo Lozano",
//       linkedIn: "https://www.linkedin.com/in/eduardo-s-lozano/",
//       github: "https://github.com/eduardoloz"
//     }
//   ];

//   return (
//     // Main container with padding and center alignment for text
//     <div className="container mx-auto px-4 py-8 text-center">
//       {/* About Us heading */}
//       <h1 className="text-4xl font-bold mb-8">About Us</h1>

//       {/* Image container: centered, with margin, rounded corners, and border */}
//       <div className="flex justify-center mb-8">
//         <img
//           src={groupPhoto}
//           alt="Group"
//           // Tailwind classes for max width, auto height, rounded corners, and border
//           className="max-w-sm h-auto rounded-lg border-4 border-gray-300"
//         />
//       </div>

//       {/* Introductory paragraph */}
//       <p className="text-lg mb-8 max-w-2xl mx-auto">
//         Introducing Karina Lam, Samantha Li, Brandon Moy, Timothy Sit, and Eduardo Lozano. We are a team dedicated to showing you UP TO DATE information
//         about your classes and visually showing them as a graph where you "unlock" new classes. We hope this website makes finding classes more accessible.
//       </p>

//       {/* Team grid container */}
//       <div
//         className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8"
//       >
//         {/* Map over members to create a card for each */}
//         {members.map((member) => (
//           // Member card with padding, border, and rounded corners
//           <div key={member.name} className="border border-gray-300 p-4 rounded-md shadow-sm flex flex-col items-center"> {/* Added flex and items-center for centering content */}
//             {/* Member name */}
//             <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
//             {/* Social links - Now in separate paragraphs */}
//             <p className="text-blue-600 hover:underline mb-1"> {/* Added mb-1 for small space */}
//               <a href={member.linkedIn} target="_blank" rel="noopener noreferrer">LinkedIn</a>
//             </p>
//             <p className="text-blue-600 hover:underline">
//               <a href={member.github} target="_blank" rel="noopener noreferrer">GitHub</a>
//             </p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// export default DegreeProgress1;
import { useState } from "react";

// ✅ Custom fallback icons (no external dependencies)
function CheckIcon({ className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={`w-5 h-5 ${className}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function CircleIcon({ className = "" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={`w-5 h-5 ${className}`}
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export default function DegreeProgress1() {
  const [selectedCategory, setSelectedCategory] = useState("Writing and Communication");

  const requirements = [
    {
      category: "Writing and Communication",
      status: "Fulfilled",
      completed: true,
      // categoryName: "Write Effectively in English",
      courses: [
        { code: "WRT 101", name: "Introductory Writing", credits: 3 },
        { code: "WRT 102", name: "Intermediate Writing", credits: 3 },
      ],
    },
    {
      category: "Arts",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "HUM 101", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "Global Issues",
      status: "In Progress",
      completed: false,
      // categoryName: "Address Problems using Critical Analysis and the Methods of the Humanities (HUM)",
      courses: [
        { code: "HUM 101", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "Humanities",
      status: "In Progress",
      completed: false,
      // categoryName: "Address Problems using Critical Analysis and the Methods of the Humanities (HUM)",
      courses: [
        { code: "HUM 101", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "Language",
      status: "In Progress",
      completed: false,
      // categoryName: "Address Problems using Critical Analysis and the Methods of the Humanities (HUM)",
      courses: [
        { code: "HUM 101", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "Quantitative Problem Solving",
      status: "In Progress",
      completed: false,
      // categoryName: "Address Problems using Critical Analysis and the Methods of the Humanities (HUM)",
      courses: [
        { code: "HUM 101", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "Social and Behavioral Sciences",
      status: "In Progress",
      completed: false,
      // categoryName: "Address Problems using Critical Analysis and the Methods of the Humanities (HUM)",
      courses: [
        { code: "HUM 101", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "Study the Natural World",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "SOC 110", name: "Introduction to Sociology", credits: 3 },
        { code: "PSY 101", name: "General Psychology", credits: 3 },
      ],
    },
    {
      category: "Technology",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "SOC 110", name: "Introduction to Sociology", credits: 3 },
        { code: "PSY 101", name: "General Psychology", credits: 3 },
      ],
    },
    {
      category: "History of USA",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "SOC 110", name: "Introduction to Sociology", credits: 3 },
        { code: "PSY 101", name: "General Psychology", credits: 3 },
      ],
    },
  ];

  const selectedReq = requirements.find((r) => r.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      {/* Navigation Bar */}
      {/* <nav className="flex flex-wrap items-center justify-between px-6 md:px-10 py-4 border-b bg-white shadow-sm">
        <div className="text-gray-300 text-lg font-semibold"> Home</div>
        <ul className="flex flex-wrap gap-4 md:gap-8 text-sm font-medium">
          <li className="text-gray-700 hover:text-black cursor-pointer">Dashboard</li>
          <li className="bg-blue-100 text-black px-3 py-1 rounded-md font-semibold cursor-pointer">Degree Progress</li>
          <li className="text-gray-700 hover:text-black cursor-pointer">Course Explorer</li>
        </ul>
      </nav> */}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto mt-10 flex flex-col md:flex-row gap-6 px-4">
        {/* Left Panel */}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-6">General Education Requirements</h1>
          <div className="flex flex-col gap-4">
            {requirements.map((req, index) => (
              <div
                key={index}
                onClick={() => setSelectedCategory(req.category)}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-sm hover:shadow-md ${req.completed ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"
                  } ${selectedCategory === req.category ? "ring-2 ring-blue-300" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {req.completed ? (
                    <CheckIcon className="text-green-500" />
                  ) : (
                    <CircleIcon className="text-gray-400" />
                  )}
                  <div>
                    <p className="font-semibold">{req.category}</p>
                    <p className="text-sm text-gray-500">{req.categoryName}</p>
                    {/* <p className="text-sm text-gray-500">
                      {req.completed ? "All completed" : "In progress"}
                    </p> */}
                  </div>
                </div>
                <div>
                  <span
                    className={`px-4 py-1 rounded-full border text-sm ${req.completed ? "text-gray-600" : "text-gray-500"
                      }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-[450px] bg-white shadow-md rounded-xl p-5">
          <h2 className="text-xl font-semibold mb-4">{selectedReq.category}</h2>
          <div className="flex flex-col gap-4">
            {selectedReq.courses.map((course, index) => (
              <div
                key={index}
                className="border rounded-xl p-3 hover:bg-gray-50 transition"
              >
                <p className="font-bold text-sm">
                  {course.code} <span className="font-normal">{course.name}</span>
                </p>
                <p className="text-sm text-gray-500">{course.credits} credits</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
