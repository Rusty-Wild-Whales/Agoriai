import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, Tag, Filter } from "lucide-react";
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

export default function Mosaic() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data: graphData, isLoading } = useGraphData();
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(null);

  const initGraph = useCallback(() => {
    if (!svgRef.current || !graphData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const nodes: SimNode[] = graphData.nodes.map((n) => ({ ...n, x: 0, y: 0 }));
    const edges: SimEdge[] = graphData.edges.map((e) => ({
      source: nodes.find((n) => n.id === e.source)!,
      target: nodes.find((n) => n.id === (e as GraphEdge).target)!,
      weight: e.weight,
    })).filter((e) => e.source && e.target);

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d: unknown) => (d as SimNode).id).distance((d: unknown) => 100 / ((d as SimEdge).weight || 1)))
      .force("charge", d3.forceManyBody().strength((d: unknown) => -(calculateNodeRadius(d as GraphNode) * 8)))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide((d: unknown) => calculateNodeRadius(d as GraphNode) + 4));

    // Edges
    const link = g.append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#d4e0f4")
      .attr("stroke-opacity", (d) => getEdgeOpacity(d.weight))
      .attr("stroke-width", (d) => Math.max(0.5, d.weight * 0.5));

    // Nodes
    const node = g.append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => calculateNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("opacity", 0.85)
      .attr("cursor", "pointer")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);

    // Labels
    const labels = g.append("g")
      .selectAll("text")
      .data(nodes.filter((n) => n.type === "company"))
      .join("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => calculateNodeRadius(d) + 14)
      .attr("font-size", "11px")
      .attr("fill", "#71717a")
      .attr("font-family", "Outfit, sans-serif");

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
        // Highlight connected
        const connected = new Set<string>();
        edges.forEach((e) => {
          if (e.source.id === d.id) connected.add(e.target.id);
          if (e.target.id === d.id) connected.add(e.source.id);
        });
        connected.add(d.id);
        node.attr("opacity", (n) => connected.has(n.id) ? 1 : 0.15);
        link.attr("stroke-opacity", (e) => e.source.id === d.id || e.target.id === d.id ? 0.6 : 0.03);
        labels.attr("opacity", (n) => connected.has(n.id) ? 1 : 0.15);
      })
      .on("mousemove", (event) => {
        setTooltipPos({ x: event.pageX, y: event.pageY });
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
        node.attr("opacity", 0.85);
        link.attr("stroke-opacity", (d) => getEdgeOpacity(d.weight));
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
  }, [graphData]);

  useEffect(() => {
    const cleanup = initGraph();
    return () => cleanup?.();
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-8rem)] bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full"
      />

      {/* Controls */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-neutral-200 rounded-xl p-2 flex flex-col gap-1 shadow-sm">
        <button
          onClick={() => handleZoom("in")}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600 cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600 cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-600 cursor-pointer"
          title="Reset view"
        >
          <RotateCcw size={18} />
        </button>
        <div className="w-full h-px bg-neutral-200 my-1" />
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${showLabels ? "bg-primary-50 text-primary-700" : "hover:bg-neutral-100 text-neutral-600"}`}
          title="Toggle labels"
        >
          <Tag size={18} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-neutral-200 rounded-xl p-3 text-xs space-y-2">
        <div className="flex items-center gap-2 font-medium text-neutral-700">
          <Filter size={12} /> Legend
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-500" /> Company
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary-500" /> Engineering
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Finance
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" /> Consulting
        </div>
        <p className="text-neutral-400">Node size = contribution</p>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 bg-white border border-neutral-200 rounded-xl shadow-lg p-3 pointer-events-none"
            style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
          >
            <p className="font-display font-semibold text-primary-900">
              {hoveredNode.label}
            </p>
            <p className="text-xs text-neutral-500 capitalize">
              {hoveredNode.type} &middot; {hoveredNode.group}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Score: {hoveredNode.size}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
