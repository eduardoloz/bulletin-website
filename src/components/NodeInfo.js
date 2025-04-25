import React from 'react';

function ProfessorInfo() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-2">Dr. Eleanor Vance</h2>
      <p className="text-gray-700 mb-1"><strong className="font-medium">Department:</strong> Computer Science</p>
      <p className="text-gray-700 mb-1"><strong className="font-medium">Research Interests:</strong> Artificial Intelligence, Machine Learning, Natural Language Processing</p>
      <p className="text-gray-700 mb-1"><strong className="font-medium">Office:</strong> Frey Hall 305</p>
      <p className="text-gray-700 mb-1"><strong className="font-medium">Email:</strong> eleanor.vance@stonybrook.edu</p>
      <p className="text-gray-700"><strong className="font-medium">Biography:</strong> Dr. Vance is a leading researcher in the field of AI, with over 15 years of experience. Her current work focuses on developing more intuitive and explainable machine learning models.</p>
    </div>
  );
}

export default ProfessorInfo;