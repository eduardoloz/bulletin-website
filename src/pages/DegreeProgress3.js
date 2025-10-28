import React, { useState } from "react";

// Updated General Education categories with example courses that fulfill them
const genEdCategories = [
    {
        name: "Explore and Understand the Fine and Performing Arts (ARTS)",
        courses: [
            { code: "ART 101", title: "Introduction to Art" },
            { code: "MUS 102", title: "Music Appreciation" },
            { code: "THE 105", title: "Theater Fundamentals" }
        ]
    },
    {
        name: "Engage Global Issues (GLO)",
        courses: [
            { code: "GLO 201", title: "Global Politics" },
            { code: "GLO 202", title: "International Relations" }
        ]
    },
    {
        name: "Address Problems using Critical Analysis and the Methods of the Humanities (HUM)",
        courses: [
            { code: "PHI 101", title: "Introduction to Philosophy" },
            { code: "HUM 210", title: "Ethics and Society" }
        ]
    },
    {
        name: "Communicate in a Human Language Other than English (LANG)",
        courses: [
            { code: "SPAN 101", title: "Elementary Spanish" },
            { code: "FREN 101", title: "Elementary French" }
        ]
    },
    {
        name: "Master Quantitative Problem Solving (QPS)",
        courses: [
            { code: "MAT 125", title: "Calculus I" },
            { code: "MAT 126", title: "Calculus II" }
        ]
    },
    {
        name: "Understand, Observe, and Analyze Human Behavior and the Structure and Functioning of Society (SBS)",
        courses: [
            { code: "PSY 101", title: "Introduction to Psychology" },
            { code: "SOC 101", title: "Introduction to Sociology" }
        ]
    },
    {
        name: "Study the Natural World (SNW)",
        courses: [
            { code: "BIO 101", title: "General Biology" },
            { code: "CHE 101", title: "General Chemistry" }
        ]
    },
    {
        name: "Understand Technology (TECH)",
        courses: [
            { code: "CSE 101", title: "Introduction to Computing" },
            { code: "CSE 114", title: "Introduction to Object-Oriented Programming" }
        ]
    },
    {
        name: "Understand the Political, Economic, Social, and Cultural History of the United States (USA)",
        courses: [
            { code: "HIS 101", title: "US History I" },
            { code: "HIS 102", title: "US History II" }
        ]
    },
    {
        name: "Write Effectively in English (WRT)",
        courses: [
            { code: "WRT 101", title: "English Composition I" },
            { code: "WRT 102", title: "Intermediate Writing" }
        ]
    }
];

const statusColors = {
    Fulfilled: "#34D399",
    "In Progress": "#FBBF24",
    Unfulfilled: "#D1D5DB",
};

function GenEdCard({ category }) {
    return (
        <div className="bg-white shadow-md rounded-lg p-4 border border-gray-200 hover:shadow-lg transition duration-150">
            <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
            <ul className="list-disc list-inside space-y-1">
                {category.courses.map((course, idx) => (
                    <li key={idx} className="text-gray-700">
                        <span className="font-medium">{course.code}</span>: {course.title}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function DegreeProgress3() {
    const [visibleCount, setVisibleCount] = useState(3);

    const showMore = () => setVisibleCount(prev => Math.min(prev + 3, genEdCategories.length));
    const showLess = () => setVisibleCount(3);

    return (
        <div className="min-h-screen bg-[#F9FAFB] p-12 font-sans text-gray-900">
            <h1 className="text-3xl font-semibold mb-8 text-center">General Education Requirements</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {genEdCategories.slice(0, visibleCount).map((category, idx) => (
                    <GenEdCard key={idx} category={category} />
                ))}
            </div>
            <div className="flex justify-center mt-6 space-x-4">
                {visibleCount < genEdCategories.length && (
                    <button onClick={showMore} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Show More</button>
                )}
                {visibleCount > 3 && (
                    <button onClick={showLess} className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400">Show Less</button>
                )}
            </div>
        </div>
    );
}
