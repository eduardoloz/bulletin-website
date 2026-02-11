import React from 'react';
import DegreeProgress1 from '../components/DegreeProgress1';

export default function DegreeProgressPanel() {
    return (
        <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
            <div className="max-w-6xl mx-auto mt-10 px-4">
                <div className="bg-white shadow-md rounded-xl p-5">
                    <h1 className="text-2xl font-semibold mb-4">Degree Progress (Panel)</h1>
                    <DegreeProgress1 />
                </div>
            </div>
        </div>
    );
}
