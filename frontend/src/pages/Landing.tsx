import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/Button";

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
}

// Floating star field — fewer, softer stars that gently drift
export function StarField() {
  const stars = Array.from({ length: 90 }, (_, i) => {
    const base = i + 1;
    const baseOpacity = seededRandom(base) * 0.4 + 0.15;
    const colorValue = seededRandom(base * 17);

    return {
      id: i,
      x: seededRandom(base * 2) * 100,
      y: seededRandom(base * 3) * 100,
      size: seededRandom(base * 5) * 2.5 + 0.8,
      opacity: baseOpacity,
      delay: seededRandom(base * 7) * 10,
      duration: seededRandom(base * 11) * 4 + 4,
      driftDuration: seededRandom(base * 13) * 15 + 12,
      animation: seededRandom(base * 19) > 0.3 ? "star-drift" : "star-shimmer",
      color: colorValue > 0.8
        ? "bg-white"
        : colorValue > 0.5
        ? "bg-slate-300"
        : "bg-slate-400/80",
    };
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`absolute rounded-full ${star.color} ${star.animation}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            "--star-base-opacity": star.opacity,
            "--star-delay": `${star.delay}s`,
            "--star-duration": `${star.duration}s`,
            "--star-drift-duration": `${star.driftDuration}s`,
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
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.12], [0, -30]);

  return (
    <div className="bg-[#060e1b] font-body overflow-x-hidden">
      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative min-h-screen flex flex-col items-center justify-center"
      >
        <StarField />

        {/* Radial glow behind hero */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.06)_0%,_transparent_60%)]" />

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060e1b]/90" />

        {/* Hero Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-display text-6xl md:text-8xl font-bold text-white mb-8 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4, delay: 0.3 }}
              className="bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent"
            >
              agoriai
            </motion.span>
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
        </div>

        {/* Scroll indicator */}
        <motion.div
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

      {/* Problem Section */}
      <section className="relative py-28 px-6 bg-[#060e1b]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium tracking-wider mb-6 border border-amber-500/20">
              THE PROBLEM
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white leading-tight">
              The playing field was never level
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={0.15} className="max-w-3xl mx-auto text-center mb-16">
            <p className="text-base md:text-lg text-slate-400 leading-relaxed">
              Students from well-connected backgrounds enter the job market with
              compounding advantages. Access to insider knowledge, mentorship, and
              referrals is gatekept by pedigree, not potential.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard value="3x" label="More likely to get interviews with connections" delay={0} />
            <StatCard value="68%" label="Feel they lack career guidance" delay={0.08} />
            <StatCard value="42%" label="Jobs filled via informal networks" delay={0.16} />
            <StatCard value="$12K" label="First job salary gap" delay={0.24} />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-28 px-6 bg-[#060e1b]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <span className="inline-block px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium tracking-wider mb-6 border border-amber-500/20">
              HOW IT WORKS
            </span>
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
      <section className="relative py-32 px-6 bg-[#060e1b]">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6">
              Ready to join the Agora?
            </h2>
            <p className="text-slate-400 mb-10 text-base md:text-lg">
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
      <footer className="bg-[#060e1b] py-10 px-6 border-t border-slate-800/30">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-display text-lg font-semibold text-white">agoriai</span>
          <p className="text-slate-500 text-sm">
            Where contribution matters more than background.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Stat card with stronger contrast
function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="p-6 rounded-xl bg-slate-800/40 border border-slate-600/30 text-center hover:border-amber-500/30 hover:bg-slate-800/60 transition-all duration-300"
    >
      <span className="block font-display text-4xl md:text-5xl font-bold text-amber-400 mb-3">
        {value}
      </span>
      <span className="block text-sm text-slate-300 leading-relaxed">
        {label}
      </span>
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
