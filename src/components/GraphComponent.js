// CourseGraph.js
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
} from 'react';
import * as d3 from 'd3';
import courses from '../data/cse.json';
import CourseGraphProcessor from './CourseGraphProcessor';   // ← keep this import

/* ---------- constants ---------- */
const WIDTH        = 960;
const HEIGHT       = 800;
const NODE_RADIUS  = 28;   // circle radius (room for label)
const ARROW_SIZE   = 10;   // arrow‑head length

/**
 * Renders the prerequisite graph with D3.
 * Nodes are pre‑laid out in centred rows by the processor; D3 forces
 * keep them on‑grid while still allowing links, drag, zoom, etc.
 */
export default function CourseGraph({ onNodeClick }) {
  /* ---------- one‑time graph data ---------- */
  const processor   = useMemo(() => new CourseGraphProcessor(courses), []);
  const data        = useMemo(() => processor.processGraph(), [processor]);

  /* ---------- React state ---------- */
  const [completedCourses, setCompletedCourses] = useState(new Set()); // green
  const [selectedCourse,   setSelectedCourse]   = useState(null);      // orange
  const [mode,             setMode]             = useState('default'); // view mode
  const [futureMode,       setFutureMode]       = useState(false);     // 2‑hop

  /* ---------- D3 refs ---------- */
  const svgRef = useRef(null);   // <svg>
  const gRef   = useRef(null);   // zoom/pan group
  const simRef = useRef(null);   // force simulation

  /* ---------- helpers ---------- */
  const toggleCompleted = id =>
    setCompletedCourses(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const getAllPrerequisites = (id, visited = new Set()) => {
    if (visited.has(id)) return visited;
    visited.add(id);
    (processor.courseMap[id]?.prerequisite || [])
      .forEach(p => getAllPrerequisites(p, visited));
    return visited;
  };

  const nodeColor = id => {
    if (mode === 'completed') {
      if (completedCourses.has(id)) return 'green';

      const unlocked = new Set();
      data.links.forEach(l => completedCourses.has(l.source.id) && unlocked.add(l.target.id));
      if (unlocked.has(id)) return 'blue';

      if (futureMode) {
        const future = new Set();
        data.links.forEach(l => unlocked.has(l.source.id) && future.add(l.target.id));
        return future.has(id) ? 'purple' : '#ccc';
      }

      return '#ccc';
    }

    if (mode === 'prereqs' && selectedCourse) {
      return getAllPrerequisites(selectedCourse).has(id) ? 'orange' : '#eee';
    }

    return 'lightgreen'; // default
  };
  

  /* ---------- D3 setup ---------- */
  const setupSvg = sel =>
    sel.attr('viewBox', [0, 0, WIDTH, HEIGHT])
       .style('border', '1px solid #888')
       .style('background', '#f9f9f9');

  const setupDefs = sel => {
    // --- Arrow marker whose tip will sit exactly on the node circumference ---
    const marker = sel.append('defs')
       .append('marker')
       .attr('id', 'arrow')
       .attr('viewBox', `0 ${-ARROW_SIZE} ${ARROW_SIZE} ${ARROW_SIZE * 2}`)
       .attr('refX', ARROW_SIZE)        // place the *tip* of the arrow at the line end
       .attr('refY', 0)
       .attr('markerWidth',  ARROW_SIZE)
       .attr('markerHeight', ARROW_SIZE)
       .attr('orient', 'auto');

    marker.append('path')
       .attr('d', `M0,${-ARROW_SIZE} L${ARROW_SIZE},0 L0,${ARROW_SIZE} Z`)
       .attr('fill', '#999');
  };

  const setupZoom = (svgSel, gSel) =>
    svgSel.call(
      d3.zoom()
        .scaleExtent([0.25, 4])
        .on('zoom', e => gSel.attr('transform', e.transform)),
    );

  const setupStaticElements = (linkG, nodeG, graphData) => {
    /* ----- nodes ----- */
    const nodeEnter = nodeG.selectAll('g.node')
      .data(graphData.nodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call( d3.drag()
              .on('start', (e,d) => dragstarted(e,d, simRef.current))
              .on('drag',  (e,d) => dragged(e,d))
              .on('end',   (e,d) => dragended(e,d, simRef.current)) );

    nodeEnter.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);

    nodeEnter.append('text')
      .attr('y', 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .text(d => d.id);

    /* ----- links ----- */
    linkG.selectAll('line')
      .data(
        graphData.links,
        d => `${typeof d.source === 'object' ? d.source.id : d.source}`
           + `->${typeof d.target === 'object' ? d.target.id : d.target}`,
      )
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)');
  };

  const setupForceSimulation = (graphData, linkG, nodeG) => {
    // Freeze every node at its pre‑laid‑out (x,y) position
    graphData.nodes.forEach(d => { d.fx = d.x; d.fy = d.y; });
    
    const sim = d3.forceSimulation(graphData.nodes)
      /* pull each node to its pre‑laid‑out (x,y) */
      .force('x',      d3.forceX(d => d.x).strength(1))
      .force('y',      d3.forceY(d => d.y).strength(1))
      /* keep links and minimal spacing */
      .force('link',   d3.forceLink(graphData.links)
                         .id(d => d.id)
                         .distance(90)
                         .strength(0.7))
      .force('collide', d3.forceCollide(NODE_RADIUS + 4))
      .alpha(1)
      .alphaDecay(0.08)
      .on('tick', () => ticked(linkG, nodeG));

    return sim;
  };

  const ticked = (linkG, nodeG) => {
    linkG.selectAll('line')
      .each(function(d) {
        const dx   = d.target.x - d.source.x;
        const dy   = d.target.y - d.source.y;
        const dist = Math.hypot(dx, dy);
        const nx   = dx / dist, ny = dy / dist;

        // Stop the visible line *exactly* at the node circumference.
        const tX = d.target.x - nx * NODE_RADIUS;
        const tY = d.target.y - ny * NODE_RADIUS;

        d3.select(this)
          .attr('x1', d.source.x)
          .attr('y1', d.source.y)
          .attr('x2', tX)
          .attr('y2', tY);
      });

    nodeG.selectAll('g.node')
         .attr('transform', d => `translate(${d.x},${d.y})`);
  };

  /* ---------- drag helpers ---------- */
  const dragstarted = (e,d,sim) => {
    if (!e.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  };
  const dragged = (e,d) => {
    d.fx = e.x; d.fy = e.y;
  };
  const dragended = (e,d,sim) => {
    if (!e.active) sim.alphaTarget(0);
    d.fx = d.x;
    d.fy = d.y;
  };

  const updateGraphVisuals = (gSel, colorFn, clickHandler) => {
    if (!gSel) return;
    gSel.selectAll('g.node > circle')
        .attr('fill', d => colorFn(d.id));
    gSel.selectAll('g.node')
        .on('click', (_,d) => clickHandler(d.id));
  };

  /* ---------- D3 lifecycle ---------- */
  useEffect(() => {
    const svg   = d3.select(svgRef.current);
    setupSvg(svg);
    setupDefs(svg);

    const g     = svg.append('g');
    const linkG = g.append('g').attr('class', 'links');
    const nodeG = g.append('g').attr('class', 'nodes');
    gRef.current = g;

    setupZoom(svg, g);
    setupStaticElements(linkG, nodeG, data);

    const sim = setupForceSimulation(data, linkG, nodeG);
    simRef.current = sim;

    return () => {
      sim.stop();
      svg.selectAll('*').remove();
    };
  }, [data]);

  useEffect(() => {
    const handleNodeClick = id => {
      if (mode === 'completed') {
        toggleCompleted(id);
      } else {
        setSelectedCourse(id);
        if (onNodeClick) onNodeClick(id);
      }
    };
  
    updateGraphVisuals(gRef.current, nodeColor, handleNodeClick);
  }, [completedCourses, selectedCourse, mode, futureMode, data, onNodeClick]);
  
  /* ---------- UI ---------- */
  const resetGraph = () => {
    setCompletedCourses(new Set());
    setSelectedCourse(null);
    setMode('default');
    setFutureMode(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl border-2 border-gray-400 rounded-lg p-4">
        <h2 className="text-xl font-bold mb-2">Course Prerequisites Graph</h2>

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

          <button
            onClick={resetGraph}
            className="px-4 py-2 rounded bg-red-500 text-white">
            Reset
          </button>
        </div>

        {/* ---------- graph ---------- */}
        <svg ref={svgRef} width="100%" height={HEIGHT} />
      </div>
    </div>
  );
}
