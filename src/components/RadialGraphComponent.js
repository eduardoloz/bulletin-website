// RadialGraphComponent.js
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
} from 'react';
import * as d3 from 'd3';
import courses from '../data/sbu_cse_courses_new_schema.json';
import CourseGraphProcessor from './CourseGraphProcessor';
import {
  buildCourseMap,
  buildCourseCodeMap,
  canTakeCourse,
  getAllPrerequisites
} from '../utils/courseUtils';
import { useUserProgress } from '../hooks/useUserProgress';

/* ---------- constants ---------- */
const WIDTH = 960;
const HEIGHT = 800;
const NODE_RADIUS = 35;
const ARROW_SIZE = 8;

/**
 * Renders the prerequisite graph with D3 radial tree layout.
 * Courses spiral outward from center, showing hierarchy through concentric rings.
 */
export default function RadialGraphComponent({ onNodeClick }) {
  /* ---------- one-time graph data ---------- */
  const processor = useMemo(() => new CourseGraphProcessor(courses), []);
  const data = useMemo(() => processor.processRadialGraph(), [processor]);
  const courseMap = useMemo(() => buildCourseMap(courses), []);
  const courseCodeMap = useMemo(() => buildCourseCodeMap(courses), []);

  /* ---------- User progress from database ---------- */
  const { progress, saving, save, isAuthenticated } = useUserProgress();

  /* ---------- React state ---------- */
  const [completedCourses, setCompletedCourses] = useState(new Set()); // IDs of completed courses
  const [externalCourses, setExternalCourses] = useState(new Set());   // External course codes
  const [selectedCourse, setSelectedCourse] = useState(null);          // Selected course ID
  const [mode, setMode] = useState('default');
  const [futureMode, setFutureMode] = useState(false);

  // Sync local state with database on load
  useEffect(() => {
    if (progress) {
      setCompletedCourses(new Set(progress.completed_courses || []));
      setExternalCourses(new Set(progress.external_courses || []));
    }
  }, [progress]);

  /* ---------- D3 refs ---------- */
  const svgRef = useRef(null);

  /* ---------- helpers with database persistence ---------- */
  const toggleCompleted = async (id) => {
    // Update local state immediately for fast UI response
    const newCompleted = new Set(completedCourses);
    newCompleted.has(id) ? newCompleted.delete(id) : newCompleted.add(id);
    setCompletedCourses(newCompleted);

    // Save to database in background (if authenticated)
    if (isAuthenticated) {
      try {
        await save({
          completedCourses: Array.from(newCompleted),
          externalCourses: Array.from(externalCourses),
          standing: progress?.standing || 1,
          majorId: progress?.major_id || null,
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
        // Note: We don't revert the local state so the graph still works
        // even if the database table doesn't exist yet
      }
    }
  };

  const addExternalCourse = async (courseCode) => {
    const trimmed = courseCode.trim().toUpperCase();
    if (!trimmed) return;

    // Update local state immediately
    const newExternal = new Set([...externalCourses, trimmed]);
    setExternalCourses(newExternal);

    // Save to database in background (if authenticated)
    if (isAuthenticated) {
      try {
        await save({
          completedCourses: Array.from(completedCourses),
          externalCourses: Array.from(newExternal),
          standing: progress?.standing || 1,
          majorId: progress?.major_id || null,
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
        // Note: We don't revert the local state so the graph still works
        // even if the database table doesn't exist yet
      }
    }
  };

  const removeExternalCourse = async (courseCode) => {
    // Update local state immediately
    const newExternal = new Set(externalCourses);
    newExternal.delete(courseCode);
    setExternalCourses(newExternal);

    // Save to database in background (if authenticated)
    if (isAuthenticated) {
      try {
        await save({
          completedCourses: Array.from(completedCourses),
          externalCourses: Array.from(newExternal),
          standing: progress?.standing || 1,
          majorId: progress?.major_id || null,
        });
      } catch (error) {
        console.error('Failed to save progress:', error);
        // Note: We don't revert the local state so the graph still works
        // even if the database table doesn't exist yet
      }
    }
  };

  // Get all prerequisite IDs for external courses that are in our course list
  const getExternalCourseIds = () => {
    const ids = new Set();
    externalCourses.forEach(code => {
      const course = courseCodeMap[code];
      if (course) ids.add(course.id);
    });
    return ids;
  };

  const nodeColor = id => {
    if (mode === 'completed') {
      if (completedCourses.has(id)) return 'green';

      const course = courseMap[id];
      if (!course) return '#ccc';

      // Combine completed CSE courses with external courses
      const allCompletedIds = new Set([...completedCourses, ...getExternalCourseIds()]);

      // Check if course is available (prerequisites satisfied)
      if (canTakeCourse(course, allCompletedIds)) {
        return 'blue';
      }

      if (futureMode) {
        // Find all currently available courses
        const currentlyAvailable = new Set();
        Object.values(courseMap).forEach(c => {
          if (!completedCourses.has(c.id) && canTakeCourse(c, allCompletedIds)) {
            currentlyAvailable.add(c.id);
          }
        });

        // Find courses available after completing all currently available courses
        const hypotheticalCompleted = new Set([...allCompletedIds, ...currentlyAvailable]);
        if (canTakeCourse(course, hypotheticalCompleted)) {
          return 'purple';
        }
      }

      return '#ccc';
    }

    if (mode === 'prereqs' && selectedCourse) {
      return getAllPrerequisites(selectedCourse, courseMap).has(id) ? 'orange' : '#eee';
    }

    return 'lightgreen';
  };

  /* ---------- D3 setup and rendering ---------- */
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);

    // Clear everything
    svg.selectAll('*').remove();

    // Set up SVG
    svg.attr('viewBox', [0, 0, WIDTH, HEIGHT])
       .style('border', '1px solid #888')
       .style('background', '#f9f9f9');

    // Create main group
    const g = svg.append('g');

    // Set up zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Set initial zoom (zoomed out to see the full graph)
    const initialTransform = d3.zoomIdentity
      .translate(WIDTH / 2, HEIGHT / 2)
      .scale(0.3);
    svg.call(zoom.transform, initialTransform);

    // Add arrow markers
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', NODE_RADIUS + 5)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999');

    // Draw links
    const linkSelection = g.selectAll('.link')
      .data(data.links);

    linkSelection.enter()
      .append('line')
      .attr('class', 'link')
      .merge(linkSelection)
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');


    // Draw nodes
    const nodeSelection = g.selectAll('.node')
      .data(data.nodes);

    const nodes = nodeSelection.enter()
      .append('g')
      .attr('class', 'node')
      .merge(nodeSelection)
      .attr('transform', d => `translate(${d.x},${d.y})`);

    nodes.selectAll('circle')
      .data(d => [d])
      .join('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', d => nodeColor(d.id))
      .attr('stroke', '#333')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (mode === 'completed') {
          toggleCompleted(d.id);
        } else {
          setSelectedCourse(d.id);
          const course = courseMap[d.id];
          if (onNodeClick && course) onNodeClick(course.code);
        }
      });

    nodes.selectAll('text')
      .data(d => [d])
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(d => d.code)
      .style('pointer-events', 'none');


    // Cleanup function
    return () => {
      svg.selectAll('*').remove();
    };
  }, [data, completedCourses, externalCourses, selectedCourse, mode, futureMode, onNodeClick, courseMap]);

  /* ---------- UI ---------- */

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-4">
        {/* Saving indicator */}
        {saving && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 text-sm font-medium">Saving your progress...</span>
          </div>
        )}

        <h2 className="text-xl font-bold mb-2">Course Prerequisites Graph - Radial View</h2>
        <div className="text-sm text-gray-600 mb-2">
          Use mouse wheel to zoom in/out. Drag to pan around the graph.
        </div>

        <div className="text-lg font-semibold my-2">
          Current Mode:&nbsp;
          <span className="text-blue-500">
            {mode === 'completed'
              ? (futureMode ? 'Completed + Future' : 'Completed')
              : mode === 'prereqs'
                ? 'Prereqs'
                : selectedCourse
                  ? `Showing prereqs for ${courseMap[selectedCourse]?.code || selectedCourse}`
                  : 'Default'}
          </span>
        </div>
        {selectedCourse && mode === 'prereqs' &&
          <div className="text-sm text-gray-600 mb-4">
            Click background or switch mode to clear selection.
          </div>}

        {/* ---------- External Courses Management ---------- */}
        {mode === 'completed' && (
          <div className="mb-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">External Courses (AMS, MAT, etc.)</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {Array.from(externalCourses).map(course => (
                <span key={course} className="bg-blue-200 px-2 py-1 rounded text-sm">
                  {course}
                  <button
                    onClick={() => removeExternalCourse(course)}
                    className="ml-1 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., MAT 125, AMS 151"
                className="px-3 py-1 border rounded"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addExternalCourse(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.target.previousElementSibling;
                  addExternalCourse(input.value);
                  input.value = '';
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Add courses from other departments (Math, Physics, etc.) that you've completed.
            </p>
          </div>
        )}

        {/* ---------- buttons ---------- */}
        <div className="flex flex-wrap gap-4 my-4 justify-center">
          <button
            onClick={() => { setMode('completed'); setSelectedCourse(null); }}
            className={`px-4 py-2 rounded text-white
                        ${mode === 'completed' ? 'bg-green-700' : 'bg-green-500'}`}>
            Completed Mode
          </button>

          {mode === 'completed' &&
            <button
              onClick={() => setFutureMode(f => !f)}
              className={`px-4 py-2 rounded text-white
                          ${futureMode ? 'bg-purple-700' : 'bg-purple-500'}`}>
              Future Mode
            </button>}

          <button
            onClick={() => setMode('prereqs')}
            className={`px-4 py-2 rounded text-white
                        ${mode === 'prereqs' ? 'bg-orange-700' : 'bg-orange-500'}`}>
            Prereqs Mode
          </button>
        </div>

        {/* ---------- graph ---------- */}
        <svg ref={svgRef} width="100%" height={HEIGHT} />
      </div>
    </div>
  );
}
