import React from 'react';
// Assuming '../data/GroupPhoto.png' is correctly located relative to this file
// and your build process handles image imports.
import groupPhoto from '../data/GroupPhoto.png';

function About() {
  const members = [
    {
      name: "Karina Lam",
      linkedIn: "#", // Replace with actual LinkedIn profile URLs
      github: "#"    // Replace with actual GitHub profile URLs
    },
    {
      name: "Samantha Li",
      linkedIn: "#",
      github: "#"
    },
    {
      name: "Brandon Moy",
      linkedIn: "#",
      github: "#"
    },
    {
      name: "Timothy Sit",
      linkedIn: "#",
      github: "#"
    },
    {
      name: "Eduardo Lozano",
      linkedIn: "#",
      github: "#"
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
        Introducing Karina Lam, Samantha Li, Brandon Moy, Timothy Sit, and Eduardo Lozano. We are a team dedicated to [briefly mention your project/goal].
      </p>

      {/* Team grid container */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-8"
      >
        {/* Map over members to create a card for each */}
        {members.map((member) => (
          // Member card with padding, border, and rounded corners
          <div key={member.name} className="border border-gray-300 p-4 rounded-md shadow-sm">
            {/* Member name */}
            <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
            {/* Social links */}
            <p className="text-blue-600 hover:underline">
              {/* Link to LinkedIn */}
              <a href={member.linkedIn} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <span className="mx-2">|</span> {/* Separator */}
              {/* Link to GitHub */}
              <a href={member.github} target="_blank" rel="noopener noreferrer">GitHub</a>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default About;
