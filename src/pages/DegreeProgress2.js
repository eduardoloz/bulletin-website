// DISABLED: General Ed requirements tracking
// This component is preserved but not currently in use

import { useState } from "react";

export default function DegreeProgress2() {
    const [selectedCategory, setSelectedCategory] = useState("ARTS");

    const categories = [
        { code: "ARTS", name: "Arts", status: "fulfilled", fulfilledWith: "ART101" },
        { code: "GLO", name: "Global" },
        { code: "HUM", name: "Humanities" },
        { code: "LANG", name: "Language", status: "exempted", fulfilledWith: "Placement Test" },
        { code: "SBS", name: "Social & Behavioral" },
        { code: "SNW", name: "Science & Nature" },
        { code: "TECH", name: "Technology", status: "fulfilled", fulfilledWith: "CSE101" },
        { code: "USA", name: "United States" },
    ];

    const courses = {
        ARTS: [
            { code: "ART101", name: "Intro to Drawing", credits: 3 },
            { code: "MUS102", name: "Music Theory I", credits: 3 },
        ],
        LANG: [
            { code: "SPA101", name: "Spanish I", credits: 4 },
            { code: "CHI101", name: "Chinese I", credits: 4 },
            { code: "FRE111", name: "French I", credits: 3 },
        ],
        HUM: [
            { code: "AAS 212", name: "Asian and Asian American Studies Topics in the Humanities", credits: 3 },
            { code: "AAS 328", name: "Race, Humor and Asian America", credits: 4 },
            { code: "AFS 340", name: "Human Rights and Africa", credits: 3 },
        ],
        GLO: [
            { code: "AFS 365", name: "Global Africa", credits: 3 },
            { code: "AMR 101", name: "Local and Global: National Boundaries and World-Systems", credits: 4 },
            { code: "ARH 391", name: "Topics in Global Art", credits: 3 },
        ],
        USA: [
            { code: "HIS 303", name: "The Crusades and Medieval Society", credits: 4 },
        ],
        SBS: [
            { code: "AAS 219", name: "Japan in the Age of Courtier and Samurai", credits: 4 },
            { code: "AAS 220", name: "China: Language and Culture", credits: 4 },
        ],
        // You can add courses for other categories as needed
    };

    const selected = categories.find((c) => c.code === selectedCategory);
    const activeCourses = courses[selectedCategory] || [];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">General Education</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Donut Chart */}
                <div className="flex items-center justify-center bg-white shadow rounded-lg p-6">
                    <svg viewBox="0 0 300 300" className="w-72 h-72">
                        <circle cx="150" cy="150" r="120" fill="#f3f4f6" />
                        {categories.map((cat, i) => {
                            const sliceAngle = 360 / categories.length;
                            const startAngle = (i * sliceAngle * Math.PI) / 180;
                            const endAngle = ((i + 1) * sliceAngle * Math.PI) / 180;
                            const x1 = 150 + 120 * Math.cos(startAngle);
                            const y1 = 150 + 120 * Math.sin(startAngle);
                            const x2 = 150 + 120 * Math.cos(endAngle);
                            const y2 = 150 + 120 * Math.sin(endAngle);
                            const largeArc = sliceAngle > 180 ? 1 : 0;

                            const pathData = `M150,150 L${x1},${y1} A120,120 0 ${largeArc},1 ${x2},${y2} Z`;

                            const isSelected = selectedCategory === cat.code;
                            const isFulfilled = cat.status === "fulfilled";
                            const isExempted = cat.status === "exempted";

                            let fillColor = "#bfdbfe"; // default blue
                            if (isFulfilled || isExempted) fillColor = "#d1d5db"; // gray for completed
                            if (isSelected) fillColor = "#2563eb"; // highlight selected

                            return (
                                <g
                                    key={cat.code}
                                    onClick={() => setSelectedCategory(cat.code)}
                                    className="cursor-pointer transition-all duration-200"
                                >
                                    <path d={pathData} fill={fillColor} stroke="#fff" strokeWidth="2" />
                                    <text
                                        x={150 + 80 * Math.cos((startAngle + endAngle) / 2)}
                                        y={150 + 80 * Math.sin((startAngle + endAngle) / 2)}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className={`text-xs font-semibold ${isSelected ? "fill-white" : "fill-gray-700"}`}
                                    >
                                        {cat.code}
                                    </text>
                                </g>
                            );
                        })}
                        <circle cx="150" cy="150" r="50" fill="white" />
                        <text
                            x="150"
                            y="150"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-sm font-medium fill-gray-600"
                        >
                            {selectedCategory}
                        </text>
                    </svg>
                </div>

                {/* Course Info */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">
                        Courses ({selectedCategory})
                    </h2>

                    {/* Fulfilled or Exempted Display */}
                    {selected?.status === "fulfilled" && (
                        <p className="text-green-600 font-medium mb-4">
                            Fulfilled with {selected.fulfilledWith || "previous course"}
                        </p>
                    )}
                    {selected?.status === "exempted" && (
                        <p className="text-blue-600 font-medium mb-4">
                            Exempted through {selected.fulfilledWith || "placement or program"}
                        </p>
                    )}

                    {/* Courses List or Message */}
                    {activeCourses.length > 0 ? (
                        <ul className="space-y-3">
                            {activeCourses.map((course) => (
                                <li
                                    key={course.code}
                                    className="flex justify-between border-b pb-2 text-gray-800"
                                >
                                    <span>
                                        <span className="font-semibold">{course.code}</span> – {course.name}
                                    </span>
                                    <span className="text-gray-500">{course.credits} credits</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">
                            {selected?.status
                                ? "No courses found for this category."
                                // ? `No courses listed for ${selectedCategory} because it is ${selected.status}.`
                                : "No courses found for this category."}
                        </p>
                    )}

                    {/* Only show button if there are courses */}
                    {activeCourses.length > 0 && (
                        <button className="mt-6 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
                            View Courses
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
