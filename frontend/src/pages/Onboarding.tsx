import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { generateAnonName } from "../utils/helpers";

const interests = [
  "Software Engineering",
  "Finance",
  "Consulting",
  "Data Science",
  "Design",
  "Product Management",
  "Marketing",
  "Operations",
  "Research",
  "Entrepreneurship",
];

// Optimized CSS-based star field
function StarField() {
  const stars = useMemo(() => {
    const result = [];
    for (let i = 0; i < 80; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.2,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 4,
      });
    }
    return result;
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a1628]">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-slate-400 animate-pulse"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [seed, setSeed] = useState("onboard-" + Date.now());
  const [university, setUniversity] = useState("");
  const [gradYear, setGradYear] = useState("2026");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const alias = generateAnonName(seed);

  const regenerate = () => setSeed("onboard-" + Date.now());

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const nextStep = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  }, []);

  const prevStep = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const finish = () => navigate("/dashboard");

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 60 : -60,
      opacity: 0,
    }),
  };

  const stepContent = [
    // Step 0: Identity
    <motion.div
      key="step0"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex-1 flex flex-col"
    >
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-white mb-3">
          Begin anonymous
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          On agoriai, you start anonymous. Your ideas speak before your
          name does. Reveal yourself later, only when you are ready.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Avatar seed={seed} size="xl" />
        <p className="font-display text-xl font-semibold text-white">
          {alias}
        </p>
        <button
          onClick={regenerate}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <RefreshCw size={14} /> Generate a new identity
        </button>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={nextStep} className="bg-amber-500 hover:bg-amber-400 text-slate-900">
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    // Step 1: University
    <motion.div
      key="step1"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex-1 flex flex-col"
    >
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-white mb-3">
          Tell us a bit about you
        </h2>
        <p className="text-slate-400 text-sm">
          This helps personalize your experience. Never tied to
          your public identity unless you choose.
        </p>
      </div>

      <div className="flex-1 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">University</label>
          <input
            type="text"
            placeholder="e.g. Stanford University"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Expected Graduation Year</label>
          <input
            type="number"
            placeholder="2026"
            value={gradYear}
            onChange={(e) => setGradYear(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={prevStep} className="text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button onClick={nextStep} className="bg-amber-500 hover:bg-amber-400 text-slate-900">
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    // Step 2: Interests
    <motion.div
      key="step2"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex-1 flex flex-col"
    >
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-white mb-3">
          What are you interested in?
        </h2>
        <p className="text-slate-400 text-sm">
          Select the areas that matter to you.
        </p>
      </div>

      <div className="flex-1 flex flex-wrap gap-2 content-start">
        {interests.map((interest) => {
          const selected = selectedInterests.includes(interest);
          return (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                selected
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-800/50 text-slate-300 border border-slate-700 hover:border-slate-500"
              }`}
            >
              {interest}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={prevStep} className="text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={selectedInterests.length === 0}
          className="bg-amber-500 hover:bg-amber-400 text-slate-900 disabled:opacity-50"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    // Step 3: Complete
    <motion.div
      key="step3"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex-1 flex flex-col items-center justify-center text-center"
    >
      <Avatar seed={seed} size="xl" />
      <h2 className="font-display text-2xl font-semibold text-white mb-2 mt-6">
        Welcome to the Agora
      </h2>
      <p className="text-slate-400 mb-2">{alias}</p>
      <div className="flex flex-wrap gap-1.5 justify-center mb-6">
        {selectedInterests.map((i) => (
          <span
            key={i}
            className="px-3 py-1 text-xs rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25"
          >
            {i}
          </span>
        ))}
      </div>
      <p className="text-slate-500 text-sm mb-8">
        Your contributions start building your presence now.
      </p>

      <Button onClick={finish} className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-8">
        <Check size={16} /> Enter the Agora
      </Button>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <span className="font-display text-2xl font-bold tracking-tight text-white">
              agoriai
            </span>
          </motion.div>

          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full overflow-hidden bg-slate-800"
              >
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            ))}
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/70 backdrop-blur-sm rounded-2xl p-8 min-h-[460px] flex flex-col border border-slate-800/50"
          >
            <AnimatePresence mode="wait" custom={direction}>
              {stepContent[step]}
            </AnimatePresence>
          </motion.div>

          {/* Step indicator */}
          <p className="text-center text-sm text-slate-600 mt-4">
            Step {step + 1} of 4
          </p>
        </div>
      </div>
    </div>
  );
}
