// CourseGraph.js
import React, {
    useRef,
    useEffect,
    useState,
    useMemo,
    useCallback, // Import useCallback
} from 'react';
import * as d3 from 'd3';
import courses from '../data/cse.json';
import CourseGraphProcessor from './CourseGraphProcessor';

/* ---------- constants ---------- */
const PADDING = 50;
const WIDTH = 960;
const HEIGHT = 800;
const NODE_RADIUS = 28;
const ARROW_SIZE = 10;


/**
 * The main component for rendering the course prerequisite graph using D3.
 * Uses a static topological layout calculated by CourseGraphProcessor for initial positions.
 * Allows nodes to be dragged, overriding their static positions.
 * Allows users to interact with nodes to mark courses as completed or view prerequisites.
 */
export default function CourseGraph() {
    /* ---------- one-time graph data ---------- */
    const processor = useMemo(() => new CourseGraphProcessor(courses), []);

    // Add a state variable to trigger re-layout on reset
    const [resetCounter, setResetCounter] = useState(0);

    // Memoize processed data, depends on processor and resetCounter
    const { data, processedLinks, graphBounds } = useMemo(() => {
        console.log("Recalculating graph data, resetCounter:", resetCounter); // Log when this runs
        const rawData = processor.processGraph();
        if (!rawData || !rawData.nodes || !rawData.links) return { data: {nodes: [], links: []}, processedLinks: [], graphBounds: null };

        // Store original positions and initialize current x/y
        const nodesWithOriginalPos = rawData.nodes.map(node => ({
            ...node,
            originalX: node.x, // Store original calculated X
            originalY: node.y, // Store original calculated Y
            // Initialize current x/y (these will be mutated by drag)
            x: node.x,
            y: node.y,
        }));

        const nodeMap = new Map(nodesWithOriginalPos.map(node => [node.id, node]));

        const links = rawData.links
            .map(link => ({
                source: nodeMap.get(link.source),
                target: nodeMap.get(link.target)
            }))
            .filter(link => link.source && link.target);

        // Calculate bounds based on *original* node positions for consistent initial view
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodesWithOriginalPos.forEach(node => {
            const x = node.originalX; // Use originalX for bounds calculation
            const y = node.originalY; // Use originalY for bounds calculation
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });

        minX -= PADDING;
        maxX += PADDING;
        minY -= PADDING;
        maxY += PADDING;

        const width = Math.max(maxX - minX, WIDTH);
        const height = Math.max(maxY - minY, HEIGHT);
        const viewX = minX + (maxX - minX - width) / 2;
        const viewY = minY + (maxY - minY - height) / 2;

        return {
            data: { nodes: nodesWithOriginalPos, links: rawData.links }, // Keep original links structure if needed elsewhere
            processedLinks: links, // Links with object references
            graphBounds: [viewX, viewY, width, height]
        };
    // Add resetCounter to dependencies to force recalculation on reset
    }, [processor, resetCounter]);


    /* ---------- React state ---------- */
    const [completedCourses, setCompletedCourses] = useState(new Set());
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [mode, setMode] = useState('default');
    const [futureMode, setFutureMode] = useState(false);

    /* ---------- D3 refs ---------- */
    const svgRef = useRef(null);
    const gRef = useRef(null);
    // Refs for node and link selections to update them during drag
    const nodeSelectionRef = useRef(null);
    const linkSelectionRef = useRef(null);


    /* ---------- helper utilities ---------- */
    const toggleCompleted = useCallback(id => {
        setCompletedCourses(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    }, []); // No dependencies needed

    const resetGraph = () => {
        setCompletedCourses(new Set());
        setSelectedCourse(null);
        setMode('default');
        setFutureMode(false);
        setResetCounter(prev => prev + 1); // Trigger re-layout
    };

    const getAllPrerequisites = useCallback((id, visited = new Set()) => {
        if (!id || visited.has(id)) return visited;
        visited.add(id);
        const courseData = processor.courseMap[id];
        if (courseData && courseData.prerequisite) {
            courseData.prerequisite.forEach(p => {
                const prereqCode = p.trim();
                if (processor.courseMap[prereqCode]) {
                    getAllPrerequisites(prereqCode, visited);
                }
            });
        }
        return visited;
    }, [processor.courseMap]); // Depends on processor

const nodeColor = useCallback((id) => {
        if (mode === 'completed') {
            if (completedCourses.has(id)) return 'green';

            // Create a map of node IDs to their current data
            const currentNodeMap = new Map(data.nodes.map(node => [node.id, node]));

            const directlyUnlocked = new Set();
            data.nodes.forEach(node => {
                const prereqs = processor.courseMap[node.id]?.prerequisite || [];
                if (prereqs.length > 0 && prereqs.every(p => completedCourses.has(p.trim()))) {
                    directlyUnlocked.add(node.id);
                }
            });

            if (directlyUnlocked.has(id) && !completedCourses.has(id)) return 'blue';

            if (futureMode) {
                const futureUnlockable = new Set();
                data.nodes.forEach(node => {
                    const prereqs = processor.courseMap[node.id]?.prerequisite || [];
                    if (prereqs.length > 0 && prereqs.every(p => completedCourses.has(p.trim()) || directlyUnlocked.has(p.trim()))){
                        if(!completedCourses.has(node.id) && !directlyUnlocked.has(node.id)){
                            futureUnlockable.add(node.id);
                        }
                    }
                });
                return futureUnlockable.has(id) ? 'purple' : '#ccc';
            }
            return '#ccc';
        }
        if (mode === 'prereqs' && selectedCourse) {
            const prereqs = getAllPrerequisites(selectedCourse);
            return prereqs.has(id) ? 'orange' : '#eee';
        }
        return 'lightgreen';
    }, [mode, completedCourses, futureMode, selectedCourse, data.nodes, processor.courseMap, getAllPrerequisites]);


    /* ---------- D3 setup and rendering functions ---------- */
    const setupSvg = (svgSelection, bounds) => {
        svgSelection
            .attr('viewBox', bounds ? bounds.join(' ') : `0 0 ${WIDTH} ${HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('border', '1px solid #888')
            .style('backgroundColor', '#f9f9f9')
            .style('max-width', '100%')
            .style('height', 'auto');
    };

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

    const setupZoom = (svgSelection, gSelection) => {
        const zoomBehavior = d3.zoom()
            .scaleExtent([0.1, 5])
            .on('zoom', e => {
                // Ensure gSelection is valid before applying transform
                if(gSelection) {
                    gSelection.attr('transform', e.transform);
                }
            });
        svgSelection.call(zoomBehavior);
        return zoomBehavior; // Return behavior if needed for reset
    };


    const setupLayers = (svgSelection) => {
        const g = svgSelection.append('g');
        const linkG = g.append('g').attr('class', 'links');
        const nodeG = g.append('g').attr('class', 'nodes');
        return { g, linkG, nodeG };
    };


    /**
     * Function to update link positions. Needed for initial setup and during drag.
     * @param {object} linkSelection - D3 selection of lines.
     */
    const updateLinkPositions = useCallback((linkSelection) => {
        linkSelection.each(function(d) {
            const sourceNode = d.source;
            const targetNode = d.target;

            // Use the *current* x, y which might have been updated by dragging
            const sx = sourceNode.x ?? sourceNode.originalX;
            const sy = sourceNode.y ?? sourceNode.originalY;
            const tx = targetNode.x ?? targetNode.originalX;
            const ty = targetNode.y ?? targetNode.originalY;

            const dx = tx - sx;
            const dy = ty - sy;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) {
                d3.select(this).attr('x1', sx).attr('y1', sy).attr('x2', tx).attr('y2', ty);
                return;
            }

            const normX = dx / distance;
            const normY = dy / distance;
            const startX = sx + normX * NODE_RADIUS;
            const startY = sy + normY * NODE_RADIUS;
            const endX = tx - normX * (NODE_RADIUS + 2);
            const endY = ty - normY * (NODE_RADIUS + 2);

            d3.select(this)
                .attr('x1', startX)
                .attr('y1', startY)
                .attr('x2', endX)
                .attr('y2', endY);
        });
    }, [NODE_RADIUS]); // Include constants if they could change, though unlikely


    /* ---------- Drag Handlers (defined outside useEffect, use useCallback) ---------- */
    const dragstarted = useCallback((event, d) => {
        d3.select(event.sourceEvent.target.parentNode) // Select the parent 'g' element
            .raise() // Bring dragged node to front
            .select('circle')
            .attr('stroke', 'black')
            .attr('stroke-width', 2);
    }, []);

    const dragged = useCallback((event, d) => {
        // Update the node's data coordinates
        d.x = event.x;
        d.y = event.y;

        // Update the node's visual position
        d3.select(event.sourceEvent.target.parentNode)
            .attr('transform', `translate(${d.x}, ${d.y})`);

        // Update positions of connected links
        if (linkSelectionRef.current) {
            const connectedLinks = linkSelectionRef.current
                .filter(linkData => linkData.source === d || linkData.target === d);
            updateLinkPositions(connectedLinks); // Use the helper function
        }
    }, [updateLinkPositions]); // Depends on the link update helper

    const dragended = useCallback((event, d) => {
        d3.select(event.sourceEvent.target.parentNode) // Select the parent 'g' element
            .select('circle')
            .attr('stroke', '#333') // Restore original stroke
            .attr('stroke-width', 1.5);
    }, []);

    // Create the drag behavior instance
    const drag = useMemo(() => d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended),
        [dragstarted, dragged, dragended] // Recreate if handlers change
    );

    /**
     * Renders/updates links and nodes. Attaches drag behavior.
     * @param {object} linkGSelection - The D3 selection for the links group.
     * @param {object} nodeGSelection - The D3 selection for the nodes group.
     * @param {object} graphData - The graph data object containing nodes.
     * @param {Array} linksData - The pre-processed links data with source/target objects.
     * @param {object} dragBehavior - The D3 drag behavior instance.
     */
    const setupElements = (linkGSelection, nodeGSelection, graphData, linksData, dragBehavior) => {

        /* ----- Links ----- */
        linkSelectionRef.current = linkGSelection.selectAll('line')
            .data(linksData, d => `<span class="math-inline">\{d\.source\.id\}\-\></span>{d.target.id}`)
            .join('line') // Use join for enter/update/exit
            .attr('stroke', '#999')
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#arrow)');

        // Set initial link positions
        updateLinkPositions(linkSelectionRef.current);


        /* ----- Nodes ----- */
        nodeSelectionRef.current = nodeGSelection.selectAll('g.node')
            .data(graphData.nodes, d => d.id)
            .join( // Use join for enter/update/exit
                enter => { // Define how new elements are created
                    const g = enter.append('g')
                        .attr('class', 'node')
                        // Set initial position based on current data (could be original or dragged)
                        .attr('transform', d => `translate(${d.x ?? d.originalX}, ${d.y ?? d.originalY})`)
                        .call(dragBehavior); // Attach drag behavior here

                    g.append('circle')
                        .attr('r', NODE_RADIUS)
                        .attr('stroke', '#333')
                        .attr('stroke-width', 1.5)
                        .attr('fill', d => nodeColor(d.id)); // Set initial color

                    g.append('text')
                        .attr('y', 4)
                        .attr('text-anchor', 'middle')
                        .attr('font-size', 11)
                        .attr('dy', '.35em')
                        .text(d => d.id);

                    return g; // Return the entering group
                },
                update => { // Define how existing elements are updated (e.g., on reset)
                    update
                        // Update position if needed (e.g., after reset)
                        .attr('transform', d => `translate(${d.x ?? d.originalX}, ${d.y ?? d.originalY})`)
                        .select('circle') // Update color if nodeColor logic changes
                        .attr('fill', d => nodeColor(d.id));
                    return update; // Return the updating selection
                },
                exit => exit.remove() // Remove elements that are no longer in the data
            );

        // Update node colors and click handlers (also handled by join's update)
        updateGraphVisuals(nodeSelectionRef.current, nodeColor, handleNodeClick);
    };


    /**
     * Updates node colors and click handlers.
     */
    const updateGraphVisuals = useCallback((nodeSelection, colorLogic, clickHandler) => {
        if (!nodeSelection) return;

        nodeSelection.select('circle')
            .transition().duration(250)
            .attr('fill', d => colorLogic(d.id));

        nodeSelection
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                // Check if the click target is the node itself or its children (circle/text)
                // Prevents drag start from triggering click immediately on some setups
                if (event.defaultPrevented) return; // Do nothing if drag already started
                event.stopPropagation();
                clickHandler(d.id);
            });
    }, []); // Empty dependency array - relies on arguments

// Define handleNodeClick using useCallback
    const handleNodeClick = useCallback((id) => {
        if (mode === 'completed') {
            toggleCompleted(id);
        } else if (mode === 'prereqs') {
            // If a course is already selected and a different node is clicked, clear the selection first
            if (selectedCourse && selectedCourse !== id) {
                setSelectedCourse(null);
                // The next part will then set the new selected course
                setTimeout(() => setSelectedCourse(id), 0); // Small delay to ensure re-render
            } else {
                setSelectedCourse(id);
            }
        } else {
            setMode('prereqs');
            setSelectedCourse(id);
        }
    }, [mode, toggleCompleted, selectedCourse, setSelectedCourse]); // Added selectedCourse and setSelectedCourse


    /* ---------- useEffect hooks ---------- */

    // Effect to set up the D3 scene (runs on mount and when data/bounds/resetCounter change)
    useEffect(() => {
        console.log("Running main D3 setup effect. Reset counter:", resetCounter)
        if (!data || !data.nodes || !graphBounds || data.nodes.length === 0) {
            console.log("Skipping D3 setup - missing data or bounds.");
            return;
        }

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove(); // Clear previous elements mandatory due to resetCounter strategy

        setupSvg(svg, graphBounds);
        setupDefs(svg);

        const { g, linkG, nodeG } = setupLayers(svg);
        gRef.current = g;

        // Setup elements (nodes, links) and attach drag handlers
        setupElements(linkG, nodeG, data, processedLinks, drag);

        // Setup zoom AFTER elements are in place
        setupZoom(svg, g);

        // Add background click handler to clear selection
        svg.on('click', () => {
            if (mode === 'prereqs' && selectedCourse) {
                setSelectedCourse(null);
            }
        });

        return () => {
            console.log("Cleaning up D3 effect.")
            svg.selectAll('*').remove(); // Clean up SVG content on unmount/re-run
            svg.on('click', null); // Remove background click listener
            // Potentially detach zoom listener if needed: svg.on('.zoom', null);
        };
        // Depend on data identity, bounds, resetCounter, and drag behavior instance
    }, [data, processedLinks, graphBounds, resetCounter, drag]);

    // Effect to update graph visuals when state changes (colors, potentially handlers if they depended on state)
    useEffect(() => {
        // Only need to update visuals, positions are handled by drag or reset effect
        if (nodeSelectionRef.current) {
            updateGraphVisuals(nodeSelectionRef.current, nodeColor, handleNodeClick);
        }
    }, [completedCourses, selectedCourse, mode, futureMode, nodeColor, handleNodeClick, updateGraphVisuals]); // Dependencies


    /* ---------- UI ---------- */
    return (
        // ... (keep existing JSX structure for buttons and layout)
        <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-10">
            <div className="w-full max-w-5xl border-2 border-gray-400 rounded-lg p-4 md:p-6 lg:p-10">
                <h2 className="text-xl font-bold mb-2 text-center md:text-left">Course Prerequisites Graph</h2>

                <div className="text-lg font-semibold my-2 text-center md:text-left">
                    Current Mode:{' '}
                    <span className="text-blue-600 font-normal">
                        {mode === 'completed'
                            ? (futureMode ? 'Completed + Future Unlocks' : 'Completed Courses')
                            : mode === 'prereqs'
                                ? (selectedCourse ? `Prerequisites for ${selectedCourse}` : 'Prerequisite View (Select Course)')
                                : 'Default (Select Course for Prereqs)'}
                    </span>
                </div>
                {selectedCourse && mode === 'prereqs' && (
                    <div className="text-sm text-gray-600 mb-4 text-center md:text-left">
                        Nodes in <span style={{color: 'orange', fontWeight: 'bold'}}>orange</span> are prerequisites for {selectedCourse}. Click background to clear.
                    </div>
                )}
                {mode === 'completed' && (
                    <div className="text-sm text-gray-600 mb-4 text-center md:text-left">
                        Click nodes to toggle completion status. <span style={{color: 'green', fontWeight: 'bold'}}>Green</span>=Completed, <span style={{color: 'blue', fontWeight: 'bold'}}>Blue</span>=Directly Unlocked{futureMode && <>, <span style={{color: 'purple', fontWeight: 'bold'}}>Purple</span>=Future Unlocked</>}. Nodes are draggable.
                    </div>
                )}
                {!selectedCourse && mode !== 'completed' && (
                    <div className="text-sm text-gray-600 mb-4 text-center md:text-left">
                        Nodes are draggable. Select a course to view prerequisites.
                    </div>
                )}


                <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-4 my-4">
                    <button
                        onClick={() => {
                            setMode('completed');
                        }}
                        className={`px-3 py-1 md:px-4 md:py-2 rounded text-white transition-colors ${
                            mode === 'completed' ? 'bg-green-700 hover:bg-green-800' : 'bg-green-500 hover:bg-green-600'
                        }`}
                    >
                        Completed Mode
                    </button>

                    {mode === 'completed' && (
                        <button
                            onClick={() => setFutureMode(f => !f)}
                            className={`px-3 py-1 md:px-4 md:py-2 rounded text-white transition-colors ${
                                futureMode ? 'bg-purple-700 hover:bg-purple-800' : 'bg-purple-500 hover:bg-purple-600'
                            }`}
                        >
                            {futureMode ? 'Hide Future' : 'Show Future'}
                        </button>
                    )}

                    <button
                        onClick={() => {
                            setMode('prereqs');
                        }}
                        className={`px-3 py-1 md:px-4 md:py-2 rounded text-white transition-colors ${
                            mode === 'prereqs' ? 'bg-orange-700 hover:bg-orange-800' : 'bg-orange-500 hover:bg-orange-600'
                        }`}
                    >
                        Prereqs Mode
                    </button>

                    <button
                        onClick={resetGraph} // Use the useCallback version
                        className="px-3 py-1 md:px-4 md:py-2 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                    >
                        Reset Layout & State
                    </button>
                </div>

                <div className="w-full overflow-hidden">
                    <svg
                        ref={svgRef}
                        width="100%"
                    />
                </div>

            </div>
        </div>
    );
}