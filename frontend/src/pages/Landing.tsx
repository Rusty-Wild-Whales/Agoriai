import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Shield, TrendingUp, Users } from "lucide-react";
import { Button } from "../components/ui/Button";

function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const nodeCount = 60;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(90, 122, 184, ${0.15 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(90, 122, 184, 0.4)";
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ duration: 0.6, delay }}
      className="bg-white/80 backdrop-blur border border-neutral-200 rounded-2xl p-8 hover:shadow-lg transition-shadow"
    >
      <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center mb-5">
        <Icon size={24} className="text-accent-600" />
      </div>
      <h3 className="font-display text-xl font-semibold text-primary-900 mb-3">
        {title}
      </h3>
      <p className="text-neutral-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}

function MosaicPreview() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const previewNodes = [
    { cx: 200, cy: 150, r: 35, fill: "#f59e0b", label: "Google" },
    { cx: 450, cy: 180, r: 30, fill: "#f59e0b", label: "Meta" },
    { cx: 320, cy: 320, r: 28, fill: "#f59e0b", label: "Stripe" },
    { cx: 120, cy: 300, r: 14, fill: "#3b5898" },
    { cx: 280, cy: 100, r: 18, fill: "#3b5898" },
    { cx: 380, cy: 260, r: 12, fill: "#16a34a" },
    { cx: 160, cy: 220, r: 16, fill: "#7c3aed" },
    { cx: 500, cy: 300, r: 10, fill: "#ec4899" },
    { cx: 350, cy: 150, r: 15, fill: "#06b6d4" },
    { cx: 80, cy: 180, r: 11, fill: "#3b5898" },
    { cx: 520, cy: 130, r: 13, fill: "#16a34a" },
    { cx: 240, cy: 250, r: 17, fill: "#f97316" },
  ];

  const previewEdges = [
    [0, 4], [0, 6], [0, 9], [0, 3], [1, 8], [1, 7], [1, 10],
    [2, 5], [2, 11], [2, 7], [3, 6], [4, 8], [5, 11],
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.8 }}
      className="relative"
    >
      <svg viewBox="0 0 600 400" className="w-full max-w-2xl mx-auto">
        {previewEdges.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={previewNodes[a].cx}
            y1={previewNodes[a].cy}
            x2={previewNodes[b].cx}
            y2={previewNodes[b].cy}
            stroke="#d4e0f4"
            strokeWidth={1}
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1, delay: 0.3 + i * 0.05 }}
          />
        ))}
        {previewNodes.map((node, i) => (
          <motion.g key={i}>
            <motion.circle
              cx={node.cx}
              cy={node.cy}
              r={node.r}
              fill={node.fill}
              opacity={0.85}
              initial={{ scale: 0 }}
              animate={inView ? { scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.06 }}
            />
            {node.label && (
              <text
                x={node.cx}
                y={node.cy + node.r + 16}
                textAnchor="middle"
                className="text-xs fill-neutral-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {node.label}
              </text>
            )}
          </motion.g>
        ))}
      </svg>
    </motion.div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-primary-900 font-body">
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <NetworkBackground />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-3xl"
        >
          <h1 className="font-display text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight">
            agoriai
          </h1>
          <p className="text-xl md:text-2xl text-primary-200 mb-4 font-light">
            Career access is a financial equity problem.
          </p>
          <p className="text-lg text-primary-300 mb-10">
            We are building the solution.
          </p>
          <Link to="/onboarding">
            <Button size="lg" className="text-base px-8">
              Join the Agora <ArrowRight size={18} />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 text-primary-400 text-sm"
        >
          Scroll to learn more
        </motion.div>
      </section>

      {/* Problem Statement */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-display text-3xl md:text-5xl font-semibold text-primary-900 mb-8"
          >
            The playing field was never level
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg text-neutral-600 leading-relaxed mb-12 max-w-2xl mx-auto"
          >
            Students from well-connected backgrounds enter the job market with
            compounding advantages. Access to insider knowledge, mentorship, and
            referrals is gatekept by pedigree, not potential.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { stat: "3x", label: "Students from connected backgrounds are 3x more likely to secure competitive internships" },
              { stat: "68%", label: "of students at non-target schools feel they lack adequate career guidance" },
              { stat: "42%", label: "of early-career opportunities are filled through informal networks" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="text-center"
              >
                <p className="font-display text-5xl font-bold text-accent-500 mb-3">
                  {item.stat}
                </p>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  {item.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-neutral-50 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-semibold text-primary-900 text-center mb-16"
          >
            How the Agora works
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Shield}
              title="Share Anonymously"
              description="Post interview experiences, rate internships, and ask questions without identity pressure. Your ideas speak before your name does."
              delay={0}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Build Through Contribution"
              description="Your visibility grows as you help others. Contribution is the currency here. Answer questions, share knowledge, earn your place."
              delay={0.15}
            />
            <FeatureCard
              icon={Users}
              title="Connect When Ready"
              description="Reveal your identity on your own terms. Build trust through genuine exchange, then choose when to step into the open."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Mosaic Preview */}
      <section className="bg-white py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="font-display text-3xl md:text-4xl font-semibold text-primary-900 mb-4"
          >
            The Mosaic
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-neutral-600 mb-12 max-w-xl mx-auto"
          >
            A living map of how knowledge flows. Companies anchor the network.
            Students grow as they contribute. See what is usually invisible.
          </motion.p>
          <MosaicPreview />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900 py-12 px-6 text-center">
        <p className="font-display text-2xl text-white mb-2">agoriai</p>
        <p className="text-primary-400 text-sm mb-6">
          Where contribution matters more than background.
        </p>
        <div className="flex justify-center gap-6 text-sm">
          <Link
            to="/onboarding"
            className="text-primary-300 hover:text-accent-400 transition-colors"
          >
            Sign Up
          </Link>
          <Link
            to="/feed"
            className="text-primary-300 hover:text-accent-400 transition-colors"
          >
            Explore
          </Link>
        </div>
      </footer>
    </div>
  );
}
