import React from 'react';
// Assuming '../data/GroupPhoto.png' is correctly located relative to this file
// and your build process handles image imports.
import groupPhoto from '../data/GroupPhoto.png';

function About() {
  const members = [
    {
      name: "Karina Lam",
      linkedIn: "https://www.linkedin.com/in/karina-lam-767a93248/", // Replace with actual LinkedIn profile URLs
      github: "https://github.com/klam118"    // Replace with actual GitHub profile URLs
    },
    {
      name: "Samantha Li",
      linkedIn: "https://www.linkedin.com/in/samanthali01/",
      github: "https://github.com/sli012"
    },
    {
      name: "Brandon Moy",
      linkedIn: "https://www.linkedin.com/in/brandon-moy-495a65278/",
      github: "https://github.com/Btmoy1122"
    },
    {
      name: "Timothy Sit",
      linkedIn: "https://www.linkedin.com/in/tim-sit/",
      github: "https://github.com/T-lang3"
    },
    {
      name: "Eduardo Lozano",
      linkedIn: "https://www.linkedin.com/in/eduardo-s-lozano/",
      github: "https://github.com/eduardoloz"
    }
  ];

  return (
    // Main container with padding and center alignment for text
    <div className="container mx-auto px-4 py-8 text-center">
      {/* About Us heading */}
      <h1 className="text-4xl font-bold mb-8">About Us</h1>

      {/* Image container: centered, with margin, rounded corners, and border */}
      <div className="flex justify-center mb-8">
        <img
          src={groupPhoto}
          alt="Group"
          // Tailwind classes for max width, auto height, rounded corners, and border
          className="max-w-sm h-auto rounded-lg border-4 border-gray-300"
        />
      </div>

      {/* Introductory paragraph */}
      <p className="text-lg mb-8 max-w-2xl mx-auto">
        Introducing Karina Lam, Samantha Li, Brandon Moy, Timothy Sit, and Eduardo Lozano. We are a team dedicated to showing you UP TO DATE information
        about your classes and visually showing them as a graph where you "unlock" new classes. We hope this website makes finding classes more accessible.
      </p>

      {/* Team grid container */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8"
      >
        {/* Map over members to create a card for each */}
        {members.map((member) => (
          // Member card with padding, border, and rounded corners
          <div key={member.name} className="border border-gray-300 p-4 rounded-md shadow-sm flex flex-col items-center"> {/* Added flex and items-center for centering content */}
            {/* Member name */}
            <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
            {/* Social links - Now in separate paragraphs */}
            <p className="text-blue-600 hover:underline mb-1"> {/* Added mb-1 for small space */}
              <a href={member.linkedIn} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </p>
            <p className="text-blue-600 hover:underline">
              <a href={member.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default About;