// DISABLED: General Ed requirements tracking
// This component is preserved but not currently in use

import { useState, useEffect } from "react";

export default function DegreeProgress1() {
  const [requirements, setRequirements] = useState([
    {
      category: "WRT",
      status: "Fulfilled",
      completed: true,
      courses: [
        { code: "WRT 101", name: "Introductory Writing", credits: 3 },
        { code: "WRT 102", name: "Intermediate Writing", credits: 3 },
      ],
    },
    {
      category: "ARTS",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "HUM 101", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "GLO",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "HUM 101", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "HUM",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "EUR 201", name: "Introduction to Humanities", credits: 3 },
        { code: "HIS 210", name: "World History", credits: 3 },
      ],
    },
    {
      category: "LANG",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "LAN 201", name: "Intermediate Spanish", credits: 3 },
        { code: "LAN 202", name: "Advanced Spanish", credits: 3 },
      ],
    },
    {
      category: "QPS",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "MAT 125", name: "Calculus A", credits: 3 },
        { code: "MAT 126", name: "Calculus B", credits: 3 },
      ],
    },
    {
      category: "SBS",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "SOC 110", name: "Intro to Sociology", credits: 3 },
        { code: "PSY 101", name: "General Psychology", credits: 3 },
      ],
    },
    {
      category: "SNW",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "BIO 101", name: "Intro to Biology", credits: 3 },
        { code: "PHY 121", name: "Physics I", credits: 3 },
      ],
    },
    {
      category: "TECH",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "CSE 101", name: "Intro to Computing", credits: 3 },
        { code: "CSE 114", name: "Intro to Java", credits: 3 },
      ],
    },
    {
      category: "USA",
      status: "In Progress",
      completed: false,
      courses: [
        { code: "HIS 103", name: "American History I", credits: 3 },
        { code: "HIS 104", name: "American History II", credits: 3 },
      ],
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (requirements.length > 0 && !selectedCategory) {
      setSelectedCategory(requirements[0].category);
    }
  }, [requirements, selectedCategory]);

  const handleCheck = (category) => {
    setRequirements((prev) =>
      prev.map((r) =>
        r.category === category
          ? {
            ...r,
            completed: !r.completed,
            status: !r.completed ? "Fulfilled" : "In Progress",
          }
          : r
      )
    );
  };

  const selectedReq = requirements.find((r) => r.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
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
                  <input
                    type="checkbox"
                    checked={req.completed}
                    onChange={() => handleCheck(req.category)}
                    // onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 accent-blue-500 cursor-pointer"
                  />

                  <div>
                    <p className="font-semibold">{req.category}</p>
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
        {selectedReq && (
          <div className="w-full md:w-[450px] bg-white shadow-md rounded-xl p-5">
            <h2 className="text-xl font-semibold mb-4">{selectedReq.category}</h2>
            <div className="flex flex-col gap-4">
              {selectedReq.courses.map((course, index) => (
                <div key={index} className="border rounded-xl p-3 hover:bg-gray-50 transition">
                  <p className="font-bold text-sm">
                    {course.code} <span className="font-normal">{course.name}</span>
                  </p>
                  <p className="text-sm text-gray-500">{course.credits} credits</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
