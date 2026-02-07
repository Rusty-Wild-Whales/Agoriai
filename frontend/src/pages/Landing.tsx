import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/Button";
import { agoraApi } from "../services/agoraApi";

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
}

// Floating star field with independent trajectories for each star.
export function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 110 }, (_, i) => {
        const base = i + 1;
        const baseOpacity = seededRandom(base * 31) * 0.45 + 0.2;
        const colorValue = seededRandom(base * 17);
        const driftX = Math.round((seededRandom(base * 43) * 16 + 6) * (base % 2 ? 1 : -1));
        const driftY = Math.round((seededRandom(base * 47) * 14 + 5) * (base % 3 ? 1 : -1));

        return {
          id: i,
          x: seededRandom(base * 2) * 100,
          y: seededRandom(base * 3) * 100,
          size: seededRandom(base * 5) * 2.6 + 0.8,
          opacity: baseOpacity,
          delay: seededRandom(base * 7) * 8,
          floatDuration: seededRandom(base * 11) * 8 + 9,
          glintDuration: seededRandom(base * 13) * 3 + 2.4,
          driftX,
          driftY,
          scaleStart: seededRandom(base * 53) * 0.35 + 0.95,
          scaleMid: seededRandom(base * 59) * 0.45 + 1.12,
          color:
            colorValue > 0.8
              ? "bg-white"
              : colorValue > 0.45
                ? "bg-slate-200"
                : "bg-amber-100",
        };
      }),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`absolute rounded-full star-float ${star.color}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            "--star-base-opacity": star.opacity,
            "--star-delay": `${star.delay}s`,
            "--star-float-duration": `${star.floatDuration}s`,
            "--star-glint-duration": `${star.glintDuration}s`,
            "--star-drift-x": `${star.driftX}px`,
            "--star-drift-y": `${star.driftY}px`,
            "--star-scale-start": star.scaleStart,
            "--star-scale-mid": star.scaleMid,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// Elegant fade-in section
function AnimatedSection({
  children,
  className = "",
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const heroOpacity = useTransform(scrollY, [0, 160], [1, 0]);
  const heroY = useTransform(scrollY, [0, 160], [0, -30]);
  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => agoraApi.getPlatformStats(),
    staleTime: 60_000,
  });

  const countFormatter = new Intl.NumberFormat("en-US");
  const formatCount = (value: number | undefined) =>
    typeof value === "number" ? countFormatter.format(Math.round(value)) : "—";
  const formattedUpdatedAt = platformStats
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(platformStats.generatedAt))
    : "Updating...";

  return (
    <div className="relative h-screen bg-[#070f1d] font-body overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="relative z-10 h-full overflow-y-auto overflow-x-hidden snap-y snap-proximity scroll-smooth"
      >
        {/* Hero Section */}
        <motion.section
          className="relative min-h-screen snap-start snap-always flex flex-col items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <StarField />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(245,158,11,0.14),transparent_46%),radial-gradient(circle_at_82%_8%,rgba(56,189,248,0.14),transparent_50%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,158,11,0.06)_0%,transparent_24%,rgba(71,85,105,0.12)_50%,transparent_72%,rgba(245,158,11,0.05)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.08)_0%,_transparent_62%)]" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent via-[#070f1d]/75 to-[#070f1d]" />
          </div>

          {/* Hero Content */}
          <motion.div
            style={{ opacity: heroOpacity, y: heroY }}
            className="relative z-10 text-center px-6 max-w-4xl mx-auto"
          >
            <motion.h1
              initial={{ opacity: 0.65, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0, ease: [0.25, 1, 0.25, 1] }}
              className="font-display text-6xl md:text-8xl font-bold text-white mb-8 tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <span className="text-white">agoriai</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-xl md:text-2xl text-slate-200 mb-3 font-light"
            >
              Career access is a financial equity problem.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-base text-slate-400 mb-12"
            >
              We are building the solution.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Link to="/onboarding">
                <Button
                  size="lg"
                  className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all"
                >
                  Join the Agora <ArrowRight size={16} />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            style={{ opacity: heroOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-amber-500/70 text-xs tracking-[0.2em] uppercase">
              Scroll to learn more
            </span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown size={20} className="text-amber-500/50" />
            </motion.div>
          </motion.div>
        </motion.section>

        <div className="relative -mt-px bg-[#070f1d]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#070f1d]/0 via-[#070f1d]/90 to-[#070f1d]" />

          {/* Problem Section */}
          <section className="relative min-h-screen snap-start snap-always py-24 md:py-28 px-6 bg-transparent flex items-center">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection className="text-center mb-16">
              <SectionEyebrow label="Mosaic Metrics" />
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white leading-tight">
                Verified Community Metrics
              </h2>
            </AnimatedSection>

            <AnimatedSection delay={0.15} className="max-w-3xl mx-auto text-center mb-16">
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                These numbers are calculated directly from the live application database, not hardcoded estimates.
              </p>
            </AnimatedSection>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                value={platformStats?.users}
                label="Registered users"
                delay={0}
                formatter={(value) => formatCount(value)}
              />
              <StatCard
                value={platformStats?.posts}
                label="Posts shared"
                delay={0.08}
                formatter={(value) => formatCount(value)}
              />
              <StatCard
                value={platformStats?.messages}
                label="Messages exchanged"
                delay={0.16}
                formatter={(value) => formatCount(value)}
              />
              <StatCard
                value={platformStats?.userConnections}
                label="User connections"
                delay={0.24}
                formatter={(value) => formatCount(value)}
              />
            </div>

            <AnimatedSection delay={0.2} className="mt-12 text-center">
              <h3 className="font-display text-2xl font-semibold text-white">Career Access Signals</h3>
              <p className="mt-2 text-sm text-slate-400">
                Context metrics that motivate the mission.
              </p>
            </AnimatedSection>

            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <ContextSignalCard value="3x" label="More likely to get interviews with connections" delay={0.04} />
              <ContextSignalCard value="68%" label="Feel they lack career guidance" delay={0.12} />
              <ContextSignalCard value="42%" label="Jobs filled via informal networks" delay={0.2} />
              <ContextSignalCard value="$12K" label="First job salary gap" delay={0.28} />
            </div>

            <div className="mt-7 flex justify-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-600/35 bg-slate-900/45 px-4 py-2 font-body text-xs tracking-[0.02em] text-slate-300">
                <span className="font-semibold uppercase tracking-[0.08em] text-slate-400">Live Data</span>
                <span>Platform database</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-200 tabular-nums">{formattedUpdatedAt}</span>
              </p>
            </div>
          </div>
          </section>

          {/* How It Works */}
          <section className="relative min-h-screen snap-start snap-always py-24 md:py-28 px-6 bg-transparent flex items-center">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection className="text-center mb-16">
              <SectionEyebrow label="Mosaic Journey" />
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
                A new model for career access
              </h2>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                number="01"
                title="Share Anonymously"
                description="Post experiences and ask questions without identity pressure. Your ideas speak first."
                delay={0}
              />
              <FeatureCard
                number="02"
                title="Build Through Contribution"
                description="Your visibility grows as you help others. Contribution is the currency here."
                delay={0.1}
              />
              <FeatureCard
                number="03"
                title="Connect When Ready"
                description="Reveal your identity on your own terms. Build trust, then step into the open."
                delay={0.2}
              />
            </div>
          </div>
          </section>

          {/* CTA Section */}
          <section className="relative min-h-screen snap-start snap-always py-24 md:py-32 px-6 bg-transparent flex items-center">
          <div className="max-w-3xl mx-auto text-center">
            <AnimatedSection>
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to join the Agora?
              </h2>
              <p className="text-slate-300 mb-10 text-base md:text-lg">
                Your contributions start building your presence the moment you arrive.
              </p>
              <Link to="/onboarding">
                <Button
                  size="lg"
                  className="px-10 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 transition-all"
                >
                  Get Started <ArrowRight size={16} />
                </Button>
              </Link>
            </AnimatedSection>
          </div>
          </section>

          {/* Footer */}
          <footer className="bg-transparent py-10 px-6 border-t border-slate-700/30">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="font-display text-lg font-semibold text-white">agoriai</span>
            <p className="text-slate-400 text-sm">
              Where contribution matters more than background.
            </p>
          </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

function AnimatedMetricValue({
  value,
  inView,
  formatter,
}: {
  value: number | undefined;
  inView: boolean;
  formatter: (value: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimatedRef = useRef(false);
  const latestTargetRef = useRef<number | undefined>(value);

  useEffect(() => {
    if (value === undefined || !inView) {
      return;
    }

    if (latestTargetRef.current === value && hasAnimatedRef.current) {
      return;
    }

    latestTargetRef.current = value;
    const from = hasAnimatedRef.current ? displayValue : 0;
    hasAnimatedRef.current = true;
    const duration = 900;
    const start = performance.now();

    let rafId = 0;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + (value - from) * eased);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [displayValue, inView, value]);

  if (value === undefined) {
    return "—";
  }

  return formatter(displayValue);
}

function SectionEyebrow({ label }: { label: string }) {
  return (
    <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-slate-900/60 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300 shadow-[0_0_0_1px_rgba(245,158,11,0.14)_inset]">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
      {label}
    </span>
  );
}

// Stat card with stronger contrast
function StatCard({
  value,
  label,
  delay,
  formatter,
}: {
  value: number | undefined;
  label: string;
  delay: number;
  formatter: (value: number) => string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px -18% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="p-6 rounded-xl bg-slate-800/40 border border-slate-600/30 text-center hover:border-amber-500/30 hover:bg-slate-800/60 transition-all duration-300"
    >
      <span className="block font-display text-4xl md:text-5xl font-bold text-amber-400 mb-3">
        <AnimatedMetricValue value={value} inView={inView} formatter={formatter} />
      </span>
      <span className="block text-sm text-slate-300 leading-relaxed">
        {label}
      </span>
    </motion.div>
  );
}

function ContextSignalCard({
  value,
  label,
  delay,
}: {
  value: string;
  label: string;
  delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px -18% 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="p-6 rounded-xl bg-slate-800/40 border border-slate-600/30 text-center hover:border-amber-500/30 hover:bg-slate-800/60 transition-all duration-300"
    >
      <span className="block font-display text-4xl md:text-5xl font-bold text-amber-400 mb-3">{value}</span>
      <span className="block text-sm text-slate-300 leading-relaxed">{label}</span>
    </motion.div>
  );
}

// Feature card with stronger contrast
function FeatureCard({ number, title, description, delay }: {
  number: string;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="p-6 rounded-xl bg-slate-800/35 border border-slate-600/25 hover:border-amber-500/25 hover:bg-slate-800/50 transition-all duration-300"
    >
      <span className="inline-block text-xs font-semibold text-amber-500 tracking-wider mb-4 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
        {number}
      </span>
      <h3 className="font-display text-lg font-semibold text-white mb-3">
        {title}
      </h3>
      <p className="text-slate-300 text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
