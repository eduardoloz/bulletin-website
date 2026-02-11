import React, { useState, useEffect } from 'react';
import CourseGraph from '../components/GraphComponent';
import RadialGraphComponent from '../components/RadialGraphComponent';
import DegreeProgress1 from '../components/DegreeProgress1';
import NodeInfo from '../components/NodeInfo';
import Legend from '../components/Legend';
import majorsList from '../data/majors.json';

export default function DegreeProgressPage() {
    const [graphView, setGraphView] = useState('grid');
    const [selectedMajor, setSelectedMajor] = useState(majorsList?.[0]?.id || 'cse');
    const [coursesData, setCoursesData] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);

    useEffect(() => {
        let mounted = true;
        const entry = majorsList.find(m => m.id === selectedMajor);
        const file = entry ? entry.data : majorsList[0].data;
        import(`../data/${file}`)
            .then(mod => {
                if (!mounted) return;
                setCoursesData(mod.default || mod);
            })
            .catch(err => {
                console.error('Failed to load major data', err);
                setCoursesData([]);
            });

        return () => { mounted = false; };
    }, [selectedMajor]);

    const handleNodeClick = (courseCode) => {
        const course = (coursesData || []).find(c => c.code === courseCode);
        setSelectedCourse(course);
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
            <div className="max-w-6xl mx-auto mt-10 px-4">
                <div className="grid grid-cols-3 gap-4 shadow-md p-4 border-2 border-gray-300 rounded-lg">
                    <div className="col-span-2 bg-white p-4 rounded-lg">
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex flex-col md:flex-row md:items-end md:gap-6">
                                <div className="flex-1 mb-4 md:mb-0">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Graph View</label>
                                    <select value={graphView} onChange={(e) => setGraphView(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                        <option value="grid">Grid Layout</option>
                                        <option value="radial">Radial Tree</option>
                                    </select>
                                </div>

                                <div className="flex-1 mb-5">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
                                    <select value={selectedMajor} onChange={(e) => setSelectedMajor(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                        {majorsList.map((m) => (
                                            <option key={m.id} value={m.id}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {graphView === 'grid' ? (
                            <CourseGraph onNodeClick={handleNodeClick} courses={coursesData} />
                        ) : (
                            <RadialGraphComponent onNodeClick={handleNodeClick} courses={coursesData} />
                        )}
                    </div>

                    <div className="col-span-1 bg-white rounded-lg p-4">
                        <NodeInfo course={selectedCourse} courses={coursesData} />
                        <div className="mt-4">
                            <Legend />
                        </div>
                    </div>
                </div>

                {/* Degree progress panel under the graph */}
                <div className="mt-6">
                    <div className="bg-white shadow-md rounded-xl p-5">
                        <DegreeProgress1 />
                    </div>
                </div>
            </div>
        </div>
    );
}
