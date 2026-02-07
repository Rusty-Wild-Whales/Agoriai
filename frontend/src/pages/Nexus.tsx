import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, Tag, Crosshair } from "lucide-react";
import { useGraphData } from "../hooks/useGraph";
import { calculateNodeRadius, getNodeColor, getEdgeOpacity } from "../utils/graphUtils";
import { Skeleton } from "../components/ui/Skeleton";
import { useUIStore } from "../stores/uiStore";
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
  const simulationCleanupRef = useRef<(() => void) | null>(null);
  const { data: graphData, isLoading } = useGraphData();
  const { darkMode } = useUIStore();

  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const clampTooltip = useCallback((x: number, y: number) => {
    const tooltipWidth = 240;
    const tooltipHeight = 96;
    const nextX = Math.min(window.innerWidth - tooltipWidth - 12, Math.max(12, x + 12));
    const nextY = Math.min(window.innerHeight - tooltipHeight - 12, Math.max(12, y - 12));
    setTooltipPos({ x: nextX, y: nextY });
  }, []);

  const fitToNodes = useCallback((duration = 750, padding = 80) => {
    if (!svgRef.current || !zoomRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select("g");
    const circles = g.selectAll<SVGCircleElement, SimNode>("circle");

    if (circles.empty()) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    circles.each((d) => {
      const radius = calculateNodeRadius(d);
      minX = Math.min(minX, d.x - radius);
      minY = Math.min(minY, d.y - radius);
      maxX = Math.max(maxX, d.x + radius);
      maxY = Math.max(maxY, d.y + radius);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

    const nodesWidth = Math.max(maxX - minX, 1);
    const nodesHeight = Math.max(maxY - minY, 1);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const scaleX = Math.max(0.1, (dimensions.width - padding * 2) / nodesWidth);
    const scaleY = Math.max(0.1, (dimensions.height - padding * 2) / nodesHeight);
    const scale = Math.min(scaleX, scaleY, 2.2);

    const translateX = dimensions.width / 2 - centerX * scale;
    const translateY = dimensions.height / 2 - centerY * scale;

    const transform = d3.zoomIdentity.translate(translateX, translateY).scale(scale);

    if (duration <= 0) {
      svg.call(zoomRef.current.transform, transform);
      return;
    }

    svg.transition().duration(duration).call(zoomRef.current.transform, transform);
  }, [dimensions.height, dimensions.width]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions((prev) => {
          const width = Math.round(rect.width);
          const height = Math.round(rect.height);
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    window.addEventListener("resize", updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const initGraph = useCallback(() => {
    if (!svgRef.current || !graphData || dimensions.width < 100 || dimensions.height < 100) return;

    simulationCleanupRef.current?.();

    const palette = darkMode
      ? {
          canvasTop: "#0b1830",
          canvasBottom: "#071225",
          tile: "rgba(148, 163, 184, 0.08)",
          link: "rgba(151, 168, 193, 0.9)",
          nodeStroke: "#0b1324",
          label: "#c9d7ec",
        }
      : {
          canvasTop: "#f8fbff",
          canvasBottom: "#ecf2fb",
          tile: "rgba(71, 85, 105, 0.1)",
          link: "rgba(100, 116, 139, 0.7)",
          nodeStroke: "#f8fbff",
          label: "#334155",
        };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;
    const nodeCount = Math.max(graphData.nodes.length, 1);
    const boundWidth = Math.min(Math.max(220, width - 72), Math.max(420, Math.sqrt(nodeCount) * 220));
    const boundHeight = Math.min(Math.max(200, height - 96), Math.max(320, Math.sqrt(nodeCount) * 180));
    const bounds = {
      minX: width / 2 - boundWidth / 2,
      maxX: width / 2 + boundWidth / 2,
      minY: height / 2 - boundHeight / 2,
      maxY: height / 2 + boundHeight / 2,
    };

    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const nodes: SimNode[] = graphData.nodes.map((node, index) => {
      const ring = Math.sqrt(index + 1);
      const radius = calculateNodeRadius(node);
      const radialDistance = Math.min(
        Math.max(boundWidth, boundHeight) * 0.42,
        64 * ring + radius * 2.2
      );
      const angle = index * goldenAngle;

      const hash = [...node.id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const jitterX = ((hash % 7) - 3) * 3;
      const jitterY = ((hash % 11) - 5) * 2;

      const seededX = width / 2 + Math.cos(angle) * radialDistance + jitterX;
      const seededY = height / 2 + Math.sin(angle) * radialDistance + jitterY;

      return {
        ...node,
        x: Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, seededX)),
        y: Math.min(bounds.maxY - radius, Math.max(bounds.minY + radius, seededY)),
      };
    });

    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const edges: SimEdge[] = graphData.edges.flatMap((edge) => {
      const source = nodesById.get(edge.source);
      const target = nodesById.get((edge as GraphEdge).target);
      if (!source || !target) return [];
      return [{ source, target, weight: edge.weight }];
    });

    const defs = svg.append("defs");
    const surfaceGradient = defs
      .append("linearGradient")
      .attr("id", "nexus-surface-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    surfaceGradient.append("stop").attr("offset", "0%").attr("stop-color", palette.canvasTop);
    surfaceGradient.append("stop").attr("offset", "100%").attr("stop-color", palette.canvasBottom);

    const tilePattern = defs
      .append("pattern")
      .attr("id", "nexus-mosaic-tiles")
      .attr("width", 30)
      .attr("height", 30)
      .attr("patternUnits", "userSpaceOnUse");
    tilePattern
      .append("path")
      .attr("d", "M 30 0 L 0 0 0 30")
      .attr("fill", "none")
      .attr("stroke", palette.tile)
      .attr("stroke-width", 0.7);

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#nexus-surface-gradient)");

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#nexus-mosaic-tiles)")
      .attr("opacity", 0.45);

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(edges)
          .id((d: unknown) => (d as SimNode).id)
          .distance((d: unknown) => {
            const weight = Math.max((d as SimEdge).weight || 1, 0.45);
            const baseDistance = Math.max(90, Math.min(200, 170 - nodeCount * 1.8));
            return baseDistance / weight;
          })
      )
      .force(
        "charge",
        d3.forceManyBody().strength((d: unknown) => -(calculateNodeRadius(d as GraphNode) * 12 + 110))
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05))
      .force("collide", d3.forceCollide((d: unknown) => calculateNodeRadius(d as GraphNode) + 26));

    // Pre-settle the initial layout so nodes do not spawn stacked at the same coordinates.
    simulation.stop();
    for (let i = 0; i < 120; i += 1) {
      simulation.tick();
    }

    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", palette.link)
      .attr("stroke-opacity", (d) => getEdgeOpacity(d.weight) * 0.72)
      .attr("stroke-linecap", "round")
      .attr("stroke-width", (d) => Math.max(0.9, d.weight * 0.7));

    const node = g
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => calculateNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("opacity", 0.96)
      .attr("cursor", "pointer")
      .attr("stroke", palette.nodeStroke)
      .attr("stroke-width", (d) => (d.type === "company" ? 2.4 : 1.8));

    const labels = g
      .append("g")
      .selectAll<SVGTextElement, SimNode>("text")
      .data(nodes.filter((n) => n.type === "company"))
      .join("text")
      .text((d) => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => calculateNodeRadius(d) + 16)
      .attr("font-size", "11.5px")
      .attr("fill", palette.label)
      .attr("font-family", "Manrope, sans-serif")
      .attr("font-weight", "650")
      .attr("paint-order", "stroke")
      .attr("stroke", darkMode ? "rgba(7,18,37,0.8)" : "rgba(248,251,255,0.85)")
      .attr("stroke-width", 2.5);

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

    const drag = d3
      .drag<SVGCircleElement, SimNode>()
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

    node
      .on("mouseenter", (event, d) => {
        setHoveredNode(d);
        clampTooltip(event.pageX, event.pageY);

        const connected = new Set<string>();
        edges.forEach((edge) => {
          if (edge.source.id === d.id) connected.add(edge.target.id);
          if (edge.target.id === d.id) connected.add(edge.source.id);
        });
        connected.add(d.id);

        node.attr("opacity", (n) => (connected.has(n.id) ? 1 : 0.2));
        link.attr("stroke-opacity", (edge) => (edge.source.id === d.id || edge.target.id === d.id ? 0.85 : 0.06));
        labels.attr("opacity", (n) => (connected.has(n.id) ? 1 : 0.2));
      })
      .on("mousemove", (event) => {
        clampTooltip(event.pageX, event.pageY);
      })
      .on("mouseleave", () => {
        setHoveredNode(null);
        node.attr("opacity", 0.96);
        link.attr("stroke-opacity", (d) => getEdgeOpacity(d.weight) * 0.72);
        labels.attr("opacity", 1);
      });

    let tickCount = 0;
    let hasAutoFit = false;

    simulation.on("tick", () => {
      nodes.forEach((node) => {
        const radius = calculateNodeRadius(node);
        node.x = Math.min(bounds.maxX - radius, Math.max(bounds.minX + radius, node.x));
        node.y = Math.min(bounds.maxY - radius, Math.max(bounds.minY + radius, node.y));
      });

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

      tickCount += 1;
      if (!hasAutoFit && tickCount > 20) {
        hasAutoFit = true;
        fitToNodes(650, 104);
      }
    });

    simulation.alpha(0.42).restart();

    const cleanup = () => {
      simulation.stop();
    };

    simulationCleanupRef.current = cleanup;
    return cleanup;
  }, [clampTooltip, darkMode, dimensions.height, dimensions.width, fitToNodes, graphData]);

  useEffect(() => {
    const cleanup = initGraph();
    return () => {
      cleanup?.();
      simulationCleanupRef.current = null;
    };
  }, [initGraph]);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGTextElement, SimNode>("text")
      .attr("visibility", showLabels ? "visible" : "hidden");
  }, [showLabels]);

  const handleZoom = (direction: "in" | "out") => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const scale = direction === "in" ? 1.3 : 0.75;
    svg.transition().duration(260).call(zoomRef.current.scaleBy, scale);
  };

  const handleReset = () => {
    fitToNodes(550, 90);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Skeleton className="w-full h-full rounded-xl" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-tutorial="nexus-graph"
      className="relative h-[calc(100vh-8rem)] rounded-2xl overflow-hidden mosaic-surface-strong"
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        width={dimensions.width}
        height={dimensions.height}
      />

      <div className="absolute top-4 right-4 mosaic-surface rounded-xl p-2 flex flex-col gap-1">
        <button
          onClick={() => handleZoom("in")}
          className="p-2 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-300 cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="p-2 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-300 cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-300 cursor-pointer"
          title="Reset view"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => fitToNodes(750, 90)}
          className="p-2 rounded-lg hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-300 cursor-pointer"
          title="Center on nodes"
        >
          <Crosshair size={18} />
        </button>
        <div className="w-full h-px bg-slate-300 dark:bg-slate-600 my-1" />
        <button
          onClick={() => setShowLabels((prev) => !prev)}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            showLabels
              ? "bg-amber-500/20 text-amber-500"
              : "hover:bg-slate-100/80 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300"
          }`}
          title="Toggle labels"
        >
          <Tag size={18} />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 mosaic-surface rounded-xl p-4 text-xs space-y-2 min-w-[170px]">
        <div className="font-medium text-slate-700 dark:text-slate-200 mb-3">Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" /> <span className="text-slate-500 dark:text-slate-400">Company</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4f7cff]" /> <span className="text-slate-500 dark:text-slate-400">User</span>
        </div>
        <p className="text-slate-500 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 mt-2">Node size = contribution</p>
      </div>

      <AnimatePresence>
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-50 mosaic-panel rounded-xl p-3 pointer-events-none"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <p className="font-display font-semibold text-slate-900 dark:text-white">
              {hoveredNode.label}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {hoveredNode.type}
            </p>
            <p className="text-xs text-slate-500 mt-1">Score: {hoveredNode.size}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
