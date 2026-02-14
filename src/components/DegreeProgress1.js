import { useState, useEffect, useMemo } from "react";
import wrtData from "../data/SBCS/WRT.json";
import artsData from "../data/SBCS/ARTS.json";
import gloData from "../data/SBCS/GLO.json";
import humData from "../data/SBCS/HUM.json";
import langData from "../data/SBCS/LANG.json";
import qpsData from "../data/SBCS/QPS.json";
import sbsData from "../data/SBCS/SBS.json";
import snwData from "../data/SBCS/SNW.json";
import techData from "../data/SBCS/TECH.json";
import usaData from "../data/SBCS/USA.json";
import majorsList from "../data/majors.json";

export default function DegreeProgress1() {
  // build courses for WRT category from static JSON file
  const wrtCourses = Array.isArray(wrtData)
    ? wrtData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const artsCourses = Array.isArray(artsData)
    ? artsData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const gloCourses = Array.isArray(gloData)
    ? gloData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const humCourses = Array.isArray(humData)
    ? humData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const langCourses = Array.isArray(langData)
    ? langData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const qpsCourses = Array.isArray(qpsData)
    ? qpsData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const sbsCourses = Array.isArray(sbsData)
    ? sbsData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const snwCourses = Array.isArray(snwData)
    ? snwData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const techCourses = Array.isArray(techData)
    ? techData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];
  const usaCourses = Array.isArray(usaData)
    ? usaData.map((c) => ({ code: c.code || `${c.deptCode} ${c.number}`, name: c.title || c.name || '', credits: c.credits || 0 }))
    : [];

  const [requirements, setRequirements] = useState([
    { category: "ARTS", status: "In Progress", completed: false, courses: artsCourses },
    { category: "GLO", status: "In Progress", completed: false, courses: gloCourses },
    { category: "HUM", status: "In Progress", completed: false, courses: humCourses },
    { category: "LANG", status: "In Progress", completed: false, courses: langCourses },
    { category: "QPS", status: "In Progress", completed: false, courses: qpsCourses },
    { category: "SBS", status: "In Progress", completed: false, courses: sbsCourses },
    { category: "SNW", status: "In Progress", completed: false, courses: snwCourses },
    { category: "TECH", status: "In Progress", completed: false, courses: techCourses },
    { category: "USA", status: "In Progress", completed: false, courses: usaCourses },
    { category: "WRT", status: "In Progress", completed: false, courses: wrtCourses },
  ]);

  // User inputs: selected major and completed GE courses
  const filteredMajors = Array.isArray(majorsList) ? majorsList.filter(m => m.id !== 'cse' && m.id !== 'ams') : [];
  const [selectedMajorForCheck, setSelectedMajorForCheck] = useState(filteredMajors?.[0]?.label || '');
  const [courseInput, setCourseInput] = useState('');
  const [userCourses, setUserCourses] = useState(new Set());

  // SBCS datasets mapping (categories may be missing; default to empty)
  const sbcsMap = useMemo(() => ({
    ARTS: artsCourses,
    GLO: gloCourses,
    HUM: humCourses,
    WRT: wrtCourses,
    LANG: langCourses,
    QPS: qpsCourses,
    SBS: sbsCourses,
    SNW: snwCourses,
    TECH: techCourses,
    USA: usaCourses,
  }), [artsCourses, gloCourses, humCourses, wrtCourses, langCourses, qpsCourses, sbsCourses, snwCourses, techCourses, usaCourses]);

  const requiredCategories = ["ARTS", "GLO", "HUM", "LANG", "QPS", "SBS", "SNW", "TECH", "USA", "WRT"];

  const exemptionMajors = useMemo(() => [
    'CEAS',
    'Athletic Training',
    'Respiratory Care',
    'Clinical Laboratory Sciences',
    'Social Work'
  ], []);

  // Normalize code strings for comparison
  const normalizeCode = (s) => (s || '').trim().toUpperCase();

  const addUserCourse = (code) => {
    const c = normalizeCode(code);
    if (!c) return;
    setUserCourses(prev => new Set([...prev, c]));
    setCourseInput('');
  };

  const removeUserCourse = (code) => {
    setUserCourses(prev => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  };

  // Recompute requirement completion whenever userCourses or selected major changes
  useEffect(() => {
    const userCodes = new Set(Array.from(userCourses).map(normalizeCode));

    // Only the exemption majors grant LANG exemption; 'Other' does not exempt
    const isLangExempt = selectedMajorForCheck !== 'Other' && exemptionMajors.some(m => m.toLowerCase() === (selectedMajorForCheck || '').toLowerCase());

    setRequirements(prev => prev.map(r => {
      const cat = r.category;

      if (cat === 'LANG' && isLangExempt) {
        return { ...r, completed: true, status: 'Fulfilled' };
      }

      const dataset = sbcsMap[cat] || [];
      const validCodes = new Set(dataset.map(c => normalizeCode(c.code)));

      const matched = Array.from(userCodes).some(code => validCodes.has(code));

      return { ...r, completed: matched, status: matched ? 'Fulfilled' : 'In Progress' };
    }));
  }, [userCourses, selectedMajorForCheck, exemptionMajors, sbcsMap]);

  const [selectedCategory, setSelectedCategory] = useState(null);

  // (removed development mount banner/log) -- production UI should be clean

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
    <div className="bg-[#F9FAFB] text-gray-900">
      <div className="max-w-6xl mx-auto mt-10 flex flex-col md:flex-row gap-6 px-4">
        {/* Left Panel */}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-6">General Education Requirements</h1>

          {/* User input form: select major and add completed GE courses */}
          <div className="mb-6 p-4 bg-white rounded-md border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Major</label>
                <select
                  value={selectedMajorForCheck}
                  onChange={(e) => setSelectedMajorForCheck(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {filteredMajors.map(m => (
                    <option key={m.id} value={m.label}>{m.label}</option>
                  ))}
                  <option value="CEAS">CEAS</option>
                  <option value="Athletic Training">Athletic Training</option>
                  <option value="Respiratory Care">Respiratory Care</option>
                  <option value="Clinical Laboratory Sciences">Clinical Laboratory Sciences</option>
                  <option value="Social Work">Social Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Add completed GE course</label>
                <div className="flex gap-2">
                  <input
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUserCourse(courseInput); } }}
                    placeholder="e.g., AAS 209"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <button onClick={() => addUserCourse(courseInput)} className="px-3 py-2 bg-blue-600 text-white rounded-md">Add</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from(userCourses).map(c => (
                    <span key={c} className="bg-gray-100 px-2 py-1 rounded flex items-center gap-2">
                      <span className="text-sm">{c}</span>
                      <button onClick={() => removeUserCourse(c)} className="text-red-600">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

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
                    // make read-only: disable direct checkbox interaction
                    disabled={true}
                    aria-disabled={true}
                    title={req.completed ? 'Requirement fulfilled' : 'Requirement not fulfilled'}
                    className="w-5 h-5 accent-blue-500 cursor-not-allowed"
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
            <h2 className="text-xl font-semibold mb-2">{selectedReq.category}</h2>
            <p className="text-sm text-gray-500 mb-4">Courses that fufill this requirement</p>
            <div className="flex flex-col gap-4 max-h-[150vh] overflow-y-auto pr-2">
              {selectedReq.courses.map((course, index) => (
                <div key={index} className="border rounded-xl p-3 hover:bg-gray-50 transition">
                  <p className="font-bold text-sm">
                    <span className="font-normal">{course.name}</span>
                  </p>
                  {/* <p className="text-sm text-gray-500">{course.credits} credits</p> */}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
