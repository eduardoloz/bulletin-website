// RadialGraphComponent.js
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
} from 'react';
import * as d3 from 'd3';
import courses from '../data/cse.json';
import CourseGraphProcessor from './CourseGraphProcessor';

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
  /* ---------- one‑time graph data ---------- */
  const processor = useMemo(() => new CourseGraphProcessor(courses), []);
  const data = useMemo(() => {
    return processor.processRadialGraph();
  }, [processor]);

  /* ---------- React state ---------- */
  const [completedCourses, setCompletedCourses] = useState(new Set());
  const [externalCourses, setExternalCourses] = useState(new Set());
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [mode, setMode] = useState('default');
  const [futureMode, setFutureMode] = useState(false);

  /* ---------- D3 refs ---------- */
  const svgRef = useRef(null);
  const zoomRef = useRef(null);

  /* ---------- helpers ---------- */
  const toggleCompleted = id =>
    setCompletedCourses(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const addExternalCourse = (courseCode) => {
    const trimmed = courseCode.trim().toUpperCase();
    if (trimmed) {
      setExternalCourses(prev => new Set([...prev, trimmed]));
    }
  };

  const removeExternalCourse = (courseCode) => {
    setExternalCourses(prev => {
      const s = new Set(prev);
      s.delete(courseCode);
      return s;
    });
  };

  const getAllPrerequisites = (id, visited = new Set()) => {
    if (visited.has(id)) return visited;
    visited.add(id);
    (processor.courseMap[id]?.prerequisite || [])
      .forEach(p => getAllPrerequisites(p, visited));
    return visited;
  };

  // Prerequisite checking - treats all prerequisites as required
  const checkPrerequisitesSatisfied = (prerequisites, completedCourses, externalCourses) => {
    if (prerequisites.length === 0) return true;
    
    return prerequisites.every(prereq => {
      const trimmed = prereq.trim();
      return completedCourses.has(trimmed) || externalCourses.has(trimmed);
    });
  };

  const nodeColor = id => {
    if (mode === 'completed') {
      if (completedCourses.has(id)) return 'green';

      const course = processor.courseMap[id];
      if (course && course.prerequisite.length > 0) {
        const prereqsSatisfied = checkPrerequisitesSatisfied(
          course.prerequisite, 
          completedCourses, 
          externalCourses
        );
        if (prereqsSatisfied) return 'blue';
      }

      if (futureMode) {
        // Future mode logic (same as regular graph)
        const currentlyAvailable = new Set();
        Object.keys(processor.courseMap).forEach(courseId => {
          if (!completedCourses.has(courseId)) {
            const course = processor.courseMap[courseId];
            if (course && course.prerequisite.length > 0) {
              const prereqsSatisfied = checkPrerequisitesSatisfied(
                course.prerequisite, 
                completedCourses, 
                externalCourses
              );
              if (prereqsSatisfied) {
                currentlyAvailable.add(courseId);
              }
            }
          }
        });

        const futureAvailable = new Set();
        Object.keys(processor.courseMap).forEach(courseId => {
          if (!completedCourses.has(courseId) && !currentlyAvailable.has(courseId)) {
            const course = processor.courseMap[courseId];
            if (course && course.prerequisite.length > 0) {
              const hypotheticalCompleted = new Set([...completedCourses, ...currentlyAvailable]);
              const prereqsSatisfied = checkPrerequisitesSatisfied(
                course.prerequisite, 
                hypotheticalCompleted, 
                externalCourses
              );
              if (prereqsSatisfied) {
                futureAvailable.add(courseId);
              }
            }
          }
        });

        return futureAvailable.has(id) ? 'purple' : '#ccc';
      }

      return '#ccc';
    }

    if (mode === 'prereqs' && selectedCourse) {
      return getAllPrerequisites(selectedCourse).has(id) ? 'orange' : '#eee';
    }

    return 'lightgreen';
  };

  /* ---------- D3 setup (runs once) ---------- */
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Set up SVG
    svg.attr('viewBox', [0, 0, WIDTH, HEIGHT])
       .style('border', '1px solid #888')
       .style('background', '#f9f9f9')
       .style('touch-action', 'none') // allow pointer-based pan/zoom
       .style('pointer-events', 'all');

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

    // Store zoom reference
    zoomRef.current = zoom;

    // Cleanup function
    return () => {
      svg.selectAll('*').remove();
    };
  }, []); // Empty dependency array - runs only once

  /* ---------- D3 rendering (runs when data changes) ---------- */
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    let g = svg.select('g');
    if (g.empty()) {
      g = svg.append('g');
    }
    
    // Clear previous content but keep the main group
    g.selectAll('.link, .node').remove();

    // Add arrow markers (only if they don't exist)
    if (svg.select('defs').empty()) {
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
    }

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
          if (onNodeClick) onNodeClick(d.id);
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
      .text(d => d.name)
      .style('pointer-events', 'none');

    // Cleanup is a no-op to preserve zoom/group
    return () => {};
  }, [data, completedCourses, externalCourses, selectedCourse, mode, futureMode]);
  
  /* ---------- UI ---------- */
  const resetGraph = () => {
    setCompletedCourses(new Set());
    setExternalCourses(new Set());
    setSelectedCourse(null);
    setMode('default');
    setFutureMode(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-2">Course Prerequisites Graph - Radial View</h2>
        <div className="text-sm text-gray-600 mb-2">
          💡 <strong>Tip:</strong> Use mouse wheel to zoom in/out. Drag to pan around the graph.
        </div>

        <div className="text-lg font-semibold my-2">
          Current Mode:&nbsp;
          <span className="text-blue-500">
            {mode === 'completed'
              ? (futureMode ? 'Completed + Future' : 'Completed')
              : mode === 'prereqs'
                ? 'Prereqs'
                : selectedCourse
                  ? `Showing prereqs for ${selectedCourse}`
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
                onKeyPress={(e) => {
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
            </button>
          }

          <button
            onClick={() => setMode('prereqs')}
            className={`px-4 py-2 rounded text-white
                        ${mode === 'prereqs' ? 'bg-blue-700' : 'bg-blue-500'}`}>
            Prereqs Mode
          </button>

          <button
            onClick={resetGraph}
            className="px-4 py-2 rounded text-white bg-red-500 hover:bg-red-600">
            Reset Graph
          </button>
        </div>

        {/* ---------- graph ---------- */}
        <svg ref={svgRef} width="100%" height={HEIGHT}>
          <g />
        </svg>
      </div>
    </div>
  );
}