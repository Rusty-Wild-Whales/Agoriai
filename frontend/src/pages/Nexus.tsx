import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, Tag, Crosshair } from "lucide-react";
import { useGraphData } from "../hooks/useGraph";
import { calculateNodeRadius, getNodeColor, getEdgeOpacity } from "../utils/graphUtils";
import { Skeleton } from "../components/ui/Skeleton";
import type { GraphNode, GraphEdge } from "../types";

interface SimNode extends GraphNode {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimEdge {
  source: SimNode;
  target: SimNode;
  weight: number;
}

export default function Nexus() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: graphData, isLoading } = useGraphData();
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Track container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: rect.width,
            height: rect.height,
          });
        }
      }
    };

    // Initial delay to ensure container is rendered
    const timeout = setTimeout(updateDimensions, 100);
    window.addEventListener('resize', updateDimensions);

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

  const initGraph = useCallback(() => {
    if (!svgRef.current || !graphData || dimensions.width < 100 || dimensions.height < 100) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    const nodes: SimNode[] = graphData.nodes.map((n) => ({ ...n, x: width / 2, y: height / 2 }));
    const edges: SimEdge[] = graphData.edges.map((e) => ({
      source: nodes.find((n) => n.id === e.source)!,
      target: nodes.find((n) => n.id === (e as GraphEdge).target)!,
      weight: e.weight,
    })).filter((e) => e.source && e.target);

    // Background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent");

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    // Center the view initially
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    svg.call(zoom.transform, initialTransform);

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d: unknown) => (d as SimNode).id).distance((d: unknown) => 120 / ((d as SimEdge).weight || 1)))
      .force("charge", d3.forceManyBody().strength((d: unknown) => -(calculateNodeRadius(d as GraphNode) * 10)))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide((d: unknown) => calculateNodeRadius(d as GraphNode) + 8));

    // Edges
    const link = g.append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", (d) => getEdgeOpacity(d.weight) * 0.6)
      .attr("stroke-width", (d) => Math.max(0.5, d.weight * 0.5));

    // Nodes
    const node = g.append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => calculateNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("opacity", 0.9)
      .attr("cursor", "pointer")
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 2);

    // Labels
    const labels = g.append("g")
      .selectAll("text")
      .data(nodes.filter((n) => n.type === "company"))
      .join("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => calculateNodeRadius(d) + 16)
      .attr("font-size", "11px")
      .attr("fill", "#94a3b8")
      .attr("font-family", "Outfit, sans-serif")
      .attr("font-weight", "500");

    // Drag
    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    node.call(drag);

    // Hover
    node
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        setTooltipPos({ x: event.pageX, y: event.pageY });
        const connected = new Set<string>();
        edges.forEach((e) => {
          if (e.source.id === d.id) connected.add(e.target.id);
          if (e.target.id === d.id) connected.add(e.source.id);
        });
        connected.add(d.id);
        node.attr("opacity", (n) => connected.has(n.id) ? 1 : 0.2);
        link.attr("stroke-opacity", (e) => e.source.id === d.id || e.target.id === d.id ? 0.8 : 0.05);
        labels.attr("opacity", (n) => connected.has(n.id) ? 1 : 0.2);
      })
      .on("mousemove", (event) => {
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
        node.attr("opacity", 0.9);
        link.attr("stroke-opacity", (d) => getEdgeOpacity(d.weight) * 0.6);
        labels.attr("opacity", 1);
      });

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node
        .attr("cx", (d) => d.x)
        .attr("cy", (d) => d.y);
      labels
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y);
    });

    return () => { simulation.stop(); };
  }, [graphData, dimensions]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const cleanup = initGraph();
      return () => cleanup?.();
    }, 200);
    return () => clearTimeout(timeout);
  }, [initGraph]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("text").attr("visibility", showLabels ? "visible" : "hidden");
  }, [showLabels]);

  const handleZoom = (direction: "in" | "out") => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const scale = direction === "in" ? 1.4 : 0.7;
    svg.transition().duration(300).call(zoomRef.current.scaleBy, scale);
  };

  const handleReset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  const handleCenterOnNodes = () => {
    if (!svgRef.current || !zoomRef.current || !graphData) return;
    const svg = d3.select(svgRef.current);

    // Get the current transform
    const g = svg.select("g");
    const circles = g.selectAll("circle");

    if (circles.empty()) return;

    // Calculate the bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    circles.each(function() {
      const cx = parseFloat(d3.select(this).attr("cx") || "0");
      const cy = parseFloat(d3.select(this).attr("cy") || "0");
      const r = parseFloat(d3.select(this).attr("r") || "0");
      minX = Math.min(minX, cx - r);
      minY = Math.min(minY, cy - r);
      maxX = Math.max(maxX, cx + r);
      maxY = Math.max(maxY, cy + r);
    });

    const nodesWidth = maxX - minX;
    const nodesHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate the scale to fit all nodes with padding
    const padding = 50;
    const scaleX = (dimensions.width - padding * 2) / nodesWidth;
    const scaleY = (dimensions.height - padding * 2) / nodesHeight;
    const scale = Math.min(scaleX, scaleY, 2); // Max scale of 2

    // Calculate translation to center
    const translateX = dimensions.width / 2 - centerX * scale;
    const translateY = dimensions.height / 2 - centerY * scale;

    const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);
    svg.transition().duration(750).call(zoomRef.current.transform, transform);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
    );
  }

  return (
    <div ref={containerRef} data-tutorial="nexus-graph" className="relative h-[calc(100vh-8rem)] bg-slate-900 dark:bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
        width={dimensions.width}
        height={dimensions.height}
      />

      {/* Controls */}
      <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl p-2 flex flex-col gap-1 shadow-lg">
        <button
          onClick={() => handleZoom("in")}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 cursor-pointer"
          title="Reset view"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={handleCenterOnNodes}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors text-slate-300 cursor-pointer"
          title="Center on nodes"
        >
          <Crosshair size={18} />
        </button>
        <div className="w-full h-px bg-slate-600 my-1" />
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${showLabels ? "bg-amber-500/20 text-amber-400" : "hover:bg-slate-700 text-slate-300"}`}
          title="Toggle labels"
        >
          <Tag size={18} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 font-medium text-slate-300 mb-3">
          Legend
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" /> <span className="text-slate-400">Company</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" /> <span className="text-slate-400">Engineering</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> <span className="text-slate-400">Finance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" /> <span className="text-slate-400">Consulting</span>
        </div>
        <p className="text-slate-500 pt-2 border-t border-slate-700 mt-2">Node size = contribution</p>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-xl p-3 pointer-events-none"
            style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
          >
            <p className="font-display font-semibold text-white">
              {hoveredNode.label}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {hoveredNode.type} - {hoveredNode.group}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Score: {hoveredNode.size}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
