// CourseGraph.js
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
} from 'react';
import * as d3 from 'd3';
import courses from '../data/cse.json';
import CourseGraphProcessor from './CourseGraphProcessor'; // ← keep this import

/* ---------- constants ---------- */
const WIDTH = 960;
const HEIGHT = 800;
const NODE_RADIUS = 28; // circle radius (room for label)
const ARROW_SIZE = 10; // arrow-head length


/**
 * The main component for rendering the course prerequisite graph using D3.
 * Allows users to interact with nodes to mark courses as completed or view prerequisites.
 */
export default function CourseGraph({ onNodeClick }) {
  /* ---------- one-time graph data ---------- */
  // Use memoization to ensure the graph data is processed only once
  const processor = useMemo(() => new CourseGraphProcessor(courses), []);
  const data = useMemo(() => processor.processGraph(), [processor]);

  /* ---------- React state ---------- */
  // Set of course IDs marked as completed
  const [completedCourses, setCompletedCourses] = useState(new Set());
  // The currently selected course ID for prerequisite highlighting
  const [selectedCourse, setSelectedCourse] = useState(null);
  // Current display mode: 'completed', 'prereqs', or 'default'
  const [mode, setMode] = useState('default');
  // Whether to show future unlocked courses in 'completed' mode
  const [futureMode, setFutureMode] = useState(false);

  /* ---------- D3 refs ---------- */
  // Reference to the main SVG element
  const svgRef = useRef(null);
  // Reference to the zoom/pan group element
  const gRef = useRef(null);
  // Reference to the D3 force simulation
  const simRef = useRef(null);

  /* ---------- helper utilities ---------- */

  /**
   * Toggles the completion status of a course.
   * @param {string} id - The ID of the course to toggle.
   */
  const toggleCompleted = id =>
    setCompletedCourses(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  /**
   * Resets the graph state to its initial default view.
   */
  const resetGraph = () => {
    setCompletedCourses(new Set());
    setSelectedCourse(null);
    setMode('default');
    setFutureMode(false);
  };

  /**
   * Recursively finds all prerequisites for a given course ID.
   * @param {string} id - The ID of the course to find prerequisites for.
   * @param {Set<string>} [visited=new Set()] - Set of visited course IDs during recursion to prevent cycles.
   * @returns {Set<string>} A set containing all prerequisite course IDs.
   */
  const getAllPrerequisites = (id, visited = new Set()) => {
    if (visited.has(id)) return visited;
    visited.add(id);
    (processor.courseMap[id]?.prerequisite || [])
      .forEach(p => getAllPrerequisites(p, visited));
    return visited;
  };

  /**
   * Determines the color of a node based on the current mode and state.
   * @param {string} id - The ID of the node (course) to color.
   * @returns {string} The color string for the node.
   */
  const nodeColor = id => {
    if (mode === 'completed') {
      if (completedCourses.has(id)) return 'green';

      // first-generation unlocks (courses whose direct prereq is completed)
      const unlocked = new Set();
      data.links.forEach(l => completedCourses.has(l.source.id) && unlocked.add(l.target.id)); // Use .id here

      if (unlocked.has(id)) return 'blue';

      if (futureMode) {
        // second-generation unlocks (courses whose direct prereq is a first-gen unlock)
        const future = new Set();
        data.links.forEach(l => unlocked.has(l.source.id) && future.add(l.target.id)); // Use .id here
        return future.has(id) ? 'purple' : '#ccc';
      }
      return '#ccc';
    }
    if (mode === 'prereqs' && selectedCourse) {
      // Check if the node is a prerequisite for the selected course
      return getAllPrerequisites(selectedCourse).has(id) ? 'orange' : '#eee';
    }
    // Default mode color
    return 'lightgreen';
  };

  /* ---------- D3 helper functions ---------- */

  /**
   * Sets up the main SVG element and its viewBox.
   * @param {object} svgSelection - The D3 selection of the SVG element.
   */
  const setupSvg = (svgSelection) => {
    svgSelection
      .attr('viewBox', [0, 0, WIDTH, HEIGHT])
      .style('border', '1px solid #888')
      .style('backgroundColor', '#f9f9f9');
  };

  /**
   * Adds necessary definitions to the SVG, like arrow markers.
   * This defines the shape and properties of the arrowhead.
   * @param {object} svgSelection - The D3 selection of the SVG element.
   */
const setupDefs = (svgSelection) => {
  svgSelection.append('defs')
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', `0 ${-ARROW_SIZE} ${ARROW_SIZE * 2} ${ARROW_SIZE * 2}`)
    .attr('refX', ARROW_SIZE + 2)  // Increased slightly to account for node radius
    .attr('refY', 0)
    .attr('markerWidth', ARROW_SIZE)
    .attr('markerHeight', ARROW_SIZE)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', `M0,${-ARROW_SIZE} L${ARROW_SIZE},0 L0,${ARROW_SIZE} Z`)
    .attr('fill', '#999');
};

  /**
   * Sets up the zoom and pan behavior on the SVG.
   * @param {object} svgSelection - The D3 selection of the SVG element.
   * @param {object} gSelection - The D3 selection of the main group element for transformations.
   */
  const setupZoom = (svgSelection, gSelection) => {
    svgSelection.call(
      d3.zoom()
        .scaleExtent([0.25, 4])
        .on('zoom', e => gSelection.attr('transform', e.transform)),
    );
  };

  /**
   * Appends the main group element and layers for links and nodes.
   * @param {object} svgSelection - The D3 selection of the SVG element.
   * @returns {object} An object containing the D3 selections for the main group, links group, and nodes group.
   */
  const setupLayers = (svgSelection) => {
    const g = svgSelection.append('g');
    const linkG = g.append('g').attr('class', 'links');
    const nodeG = g.append('g').attr('class', 'nodes');
    return {
      g,
      linkG,
      nodeG
    };
  };

  /**
   * Renders the static links and nodes in the graph.
   * @param {object} linkGSelection - The D3 selection for the links group.
   * @param {object} nodeGSelection - The D3 selection for the nodes group.
   * @param {object} graphData - The graph data object containing nodes and links.
   * @param {object} simulation - The D3 force simulation instance.
   */
  const setupStaticElements = (linkGSelection, nodeGSelection, graphData, simulation) => {

  console.log('linkGSelection', graphData);
    /* ----- static nodes ----- */
    const nodeEnter = nodeGSelection.selectAll('g.node')
      .data(graphData.nodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
      .on('start', (event, d) => dragstarted(event, d, simRef.current))
      .on('drag', (event, d) => dragged(event, d))
      .on('end', (event, d) => dragended(event, d, simRef.current)));

    nodeEnter.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);

    nodeEnter.append('text')
      .attr('y', 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .text(d => d.id);

    
  /* ----- static links ----- */
  linkGSelection.selectAll('line')
  .data(graphData.links, d => `${d.source.id}->${d.target.id}`) // Use .id for key
  .enter()
  .append('line')
  .attr('stroke', '#999')
  .attr('stroke-width', 1.5)
  .attr('marker-end', 'url(#arrow)'); // <-- This line applies the marker by referencing its ID
  };

  /**
   * Sets up and starts the D3 force simulation.
   * @param {object} graphData - The graph data object containing nodes and links.
   * @param {object} linkGSelection - The D3 selection for the links group.
   * @param {object} nodeGSelection - The D3 selection for the nodes group.
   * @returns {object} The D3 force simulation instance.
   */
  const setupForceSimulation = (graphData, linkGSelection, nodeGSelection) => {
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
      .force('collide', d3.forceCollide(NODE_RADIUS + 4))
      .on('tick', () => ticked(linkGSelection, nodeGSelection));

    return simulation;
  };

  /**
   * The tick function for the force simulation, updates element positions.
   * @param {object} linkGSelection - The D3 selection for the links group.
   * @param {object} nodeGSelection - The D3 selection for the nodes group.
   */
  const ticked = (linkGSelection, nodeGSelection) => {
    linkGSelection.selectAll('line')
      .each(function(d) { // Use .each to access each line element
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        const targetX = d.target.x - normalizedX * NODE_RADIUS;
        const targetY = d.target.y - normalizedY * NODE_RADIUS;
        d3.select(this)
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', targetX)
          .attr('y2', targetY);
      });

    nodeGSelection.selectAll('g.node')
      .attr('transform', d => `translate(${d.x},${d.y})`);
  };

  /**
   * Drag start handler for nodes.
   * @param {object} event - The D3 drag event.
   * @param {object} d - The data bound to the dragged node.
   * @param {object} simulation - The D3 force simulation instance.
   */
  const dragstarted = (event, d, simulation) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  /**
   * Drag handler for nodes.
   * @param {object} event - The D3 drag event.
   * @param {object} d - The data bound to the dragged node.
   */
  const dragged = (event, d) => {
    d.fx = event.x;
    d.fy = event.y;
  };

  /**
   * Drag end handler for nodes.
   * @param {object} event - The D3 drag event.
   * @param {object} d - The data bound to the dragged node.
   * @param {object} simulation - The D3 force simulation instance.
   */
  const dragended = (event, d, simulation) => {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  };

  /**
   * Updates the visual properties of graph elements based on current React state
   * (e.g., node colors and click handlers).
   * @param {object} gSelection - The D3 selection of the main group element.
   * @param {Function} colorLogic - Function to determine node color.
   * @param {Function} clickHandler - Function to handle node clicks.
   */
  const updateGraphVisuals = (gSelection, colorLogic, clickHandler) => {
    if (!gSelection) return;

    /* update circle fills */
    gSelection
      .selectAll('g.node > circle')
      .attr('fill', d => colorLogic(d.id));

    /* (re)attach click handler */
    gSelection
      .selectAll('g.node')
      .on('click', (_, d) => clickHandler(d.id));
  };

  /* ---------- useEffect hooks (manage D3 lifecycle) ---------- */

  // Effect to set up the D3 scene (runs once after initial render)
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    setupSvg(svg);
    setupDefs(svg);

    const {
      g,
      linkG,
      nodeG
    } = setupLayers(svg);
    gRef.current = g; // Store the main group selection in ref

    setupZoom(svg, g);
    setupStaticElements(linkG, nodeG, data, simRef.current); // Pass simRef.current for drag handlers

    const simulation = setupForceSimulation(data, linkG, nodeG);
    simRef.current = simulation; // Store the simulation instance in ref

    /* cleanup on unmount */
    return () => {
      simulation.stop();
      svg.selectAll('*').remove();
    };
  }, [data]); // Re-run only if graph data changes (unlikely in this app)

  // Effect to update graph visuals when state changes (colors, click handlers)
  useEffect(() => {
    const handleNodeClick = (id) => {
      if (mode === 'completed') toggleCompleted(id);
      else {
        setSelectedCourse(id);
        if (onNodeClick) onNodeClick(id); // ← Added this line only
      }
    };
    updateGraphVisuals(gRef.current, nodeColor, handleNodeClick);
  }, [completedCourses, selectedCourse, mode, futureMode, data, onNodeClick]);
  

  /* ---------- UI ---------- */
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-10">
      <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-10">
        <h2 className="text-xl font-bold mb-2">Course Prerequisites Graph</h2>

        <div className="text-lg font-semibold my-2">
          Current Mode:{' '}
          <span className="text-blue-500">
            {mode === 'completed'
              ? (futureMode ? 'Completed + Future' : 'Completed')
              : mode === 'prereqs'
                ? 'Prereqs'
                : selectedCourse ? `Showing Prereqs for ${selectedCourse}` : 'Default'}
          </span>
        </div>
        {selectedCourse && mode === 'prereqs' && (
           <div className="text-sm text-gray-600 mb-4">
             Click anywhere on the background or switch mode to clear selection.
           </div>
        )}


        <div className="flex flex-wrap gap-4 my-4">
          <button
            onClick={() => {
              setMode('completed');
              setSelectedCourse(null); // Clear selection when switching mode
            }}
            className={`px-4 py-2 rounded text-white ${
              mode === 'completed' ? 'bg-green-700' : 'bg-green-500'
            }`}
          >
            Completed Mode
          </button>

          {mode === 'completed' && (
            <button
              onClick={() => setFutureMode(f => !f)}
              className={`px-4 py-2 rounded text-white ${
                futureMode ? 'bg-purple-700' : 'bg-purple-500'
              }`}
            >
              Future Mode
            </button>
          )}

          <button
            onClick={() => {
              setMode('prereqs');
               // No need to clear selectedCourse here, as 'prereqs' mode uses it
            }}
            className={`px-4 py-2 rounded text-white ${
              mode === 'prereqs' ? 'bg-orange-700' : 'bg-orange-500'
            }`}
          >
            Prereqs Mode
          </button>

          <button
            onClick={resetGraph}
            className="px-4 py-2 rounded bg-red-500 text-white"
          >
            Reset
          </button>
        </div>

        {/* The SVG container for the D3 graph */}
        <svg
          ref={svgRef}
          width="100%"
          height={HEIGHT}
          // Styles are now applied in setupSvg helper
        />
      </div>
    </div>
  );
}