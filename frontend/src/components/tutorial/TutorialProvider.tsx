import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "../ui/Button";

// Tutorial step definition
export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: string; // Description of what to do
}

// Tutorial definition
export interface Tutorial {
  id: string;
  name: string;
  description: string;
  steps: TutorialStep[];
}

// Built-in tutorials
export const tutorials: Record<string, Tutorial> = {
  welcome: {
    id: "welcome",
    name: "Welcome to Agoriai",
    description: "Learn the basics of the platform",
    steps: [
      {
        id: "intro",
        title: "Welcome to the Agora",
        content: "Agoriai is a platform where your contributions speak louder than your credentials. Here, you can share experiences, ask questions, and connect with others - all while controlling your privacy.",
        position: "center",
      },
      {
        id: "dashboard",
        title: "Your Dashboard",
        content: "This is your home base. You'll see your stats, recent activity, and trending discussions. Your contribution score grows as you help others.",
        target: "[data-tutorial='dashboard-stats']",
        position: "bottom",
      },
      {
        id: "feed",
        title: "The Feed",
        content: "Browse and share experiences about interviews, internships, and career advice. Use filters to find exactly what you're looking for.",
        target: "[data-tutorial='nav-feed']",
        position: "right",
      },
      {
        id: "nexus",
        title: "The Nexus",
        content: "Explore the network of companies and connections. Discover how different organizations relate to the community.",
        target: "[data-tutorial='nav-nexus']",
        position: "right",
      },
      {
        id: "privacy",
        title: "Your Privacy",
        content: "Click on your profile in the sidebar to access settings. You can choose how much of your identity to reveal - from fully anonymous to using your real name.",
        target: "[data-tutorial='user-profile']",
        position: "top",
      },
      {
        id: "complete",
        title: "You're Ready!",
        content: "Start contributing to the Agora. Remember: your ideas matter more than your background here. Good luck on your journey!",
        position: "center",
      },
    ],
  },
  posting: {
    id: "posting",
    name: "How to Post",
    description: "Learn how to share your experiences",
    steps: [
      {
        id: "start",
        title: "Sharing Your Experience",
        content: "Contributing to the community is easy. Let's walk through how to create a post.",
        position: "center",
      },
      {
        id: "composer",
        title: "The Post Composer",
        content: "Click here to start writing your post. You can share interview experiences, ask questions, or offer career advice.",
        target: "[data-tutorial='post-composer']",
        position: "bottom",
      },
      {
        id: "categories",
        title: "Choose a Category",
        content: "Select the most relevant category for your post. This helps others find your content.",
        position: "center",
      },
      {
        id: "tags",
        title: "Add Tags",
        content: "Tags help organize content. Add relevant tags like company names, industries, or topics.",
        position: "center",
      },
      {
        id: "done",
        title: "That's It!",
        content: "Your post will be visible to the community based on your privacy settings. Thanks for contributing!",
        position: "center",
      },
    ],
  },
};

interface TutorialContextType {
  activeTutorial: Tutorial | null;
  currentStep: number;
  startTutorial: (tutorialId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  endTutorial: () => void;
  skipTutorial: () => void;
  completedTutorials: string[];
  markComplete: (tutorialId: string) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}

// Load completed tutorials from localStorage
function loadCompletedTutorials(): string[] {
  try {
    const saved = localStorage.getItem("agoriai_completed_tutorials");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save completed tutorials to localStorage
function saveCompletedTutorials(ids: string[]) {
  localStorage.setItem("agoriai_completed_tutorials", JSON.stringify(ids));
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>(loadCompletedTutorials);

  const startTutorial = useCallback((tutorialId: string) => {
    const tutorial = tutorials[tutorialId];
    if (tutorial) {
      setActiveTutorial(tutorial);
      setCurrentStep(0);
    }
  }, []);

  const markComplete = useCallback((tutorialId: string) => {
    setCompletedTutorials((prev) => {
      if (prev.includes(tutorialId)) return prev;
      const updated = [...prev, tutorialId];
      saveCompletedTutorials(updated);
      return updated;
    });
  }, []);

  const endTutorial = useCallback(() => {
    if (activeTutorial) {
      markComplete(activeTutorial.id);
    }
    setActiveTutorial(null);
    setCurrentStep(0);
  }, [activeTutorial, markComplete]);

  const nextStep = useCallback(() => {
    if (activeTutorial && currentStep < activeTutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTutorial();
    }
  }, [activeTutorial, currentStep, endTutorial]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const skipTutorial = useCallback(() => {
    setActiveTutorial(null);
    setCurrentStep(0);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        activeTutorial,
        currentStep,
        startTutorial,
        nextStep,
        prevStep,
        endTutorial,
        skipTutorial,
        completedTutorials,
        markComplete,
      }}
    >
      {children}
      <TutorialOverlay />
    </TutorialContext.Provider>
  );
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function TutorialOverlay() {
  const { activeTutorial, currentStep, nextStep, prevStep, skipTutorial } = useTutorial();
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const step = activeTutorial?.steps[currentStep];
  const hasTarget = step?.target && step.position !== "center";

  // Find and track target element
  useEffect(() => {
    if (!step?.target || step.position === "center") {
      setTargetRect(null);
      return;
    }

    const findAndMeasure = () => {
      const element = document.querySelector(step.target!);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        setTargetRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Calculate tooltip position
        const tooltipWidth = 380;
        const tooltipHeight = 200;
        const gap = 16;
        let style: React.CSSProperties = {};

        switch (step.position) {
          case "top":
            style = {
              bottom: window.innerHeight - rect.top + gap,
              left: Math.max(16, rect.left + rect.width / 2 - tooltipWidth / 2),
            };
            break;
          case "bottom":
            style = {
              top: rect.bottom + gap,
              left: Math.max(16, rect.left + rect.width / 2 - tooltipWidth / 2),
            };
            break;
          case "left":
            style = {
              top: Math.max(16, rect.top + rect.height / 2 - tooltipHeight / 2),
              right: window.innerWidth - rect.left + gap,
            };
            break;
          case "right":
            style = {
              top: Math.max(16, rect.top + rect.height / 2 - tooltipHeight / 2),
              left: rect.right + gap,
            };
            break;
        }

        setTooltipStyle(style);
      }
    };

    findAndMeasure();
    const interval = setInterval(findAndMeasure, 100);
    window.addEventListener("resize", findAndMeasure);
    window.addEventListener("scroll", findAndMeasure);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", findAndMeasure);
      window.removeEventListener("scroll", findAndMeasure);
    };
  }, [step]);

  if (!activeTutorial || !step) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === activeTutorial.steps.length - 1;
  const progress = ((currentStep + 1) / activeTutorial.steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] pointer-events-auto"
      >
        {/* Backdrop with spotlight cutout */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            {/* Blur filter for the backdrop */}
            <filter id="tutorial-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
            {/* Mask with spotlight hole */}
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {hasTarget && targetRect && (
                <rect
                  x={targetRect.left}
                  y={targetRect.top}
                  width={targetRect.width}
                  height={targetRect.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          {/* Dark overlay with spotlight hole */}
          <rect
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.85)"
            mask="url(#spotlight-mask)"
            style={{ backdropFilter: "blur(4px)" }}
          />
        </svg>

        {/* Spotlight glow ring */}
        {hasTarget && targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute rounded-xl border-2 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 z-10">
          <motion.div
            className="h-full bg-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Tutorial tooltip card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`absolute w-[380px] max-w-[calc(100vw-32px)] ${
            !hasTarget ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
          }`}
          style={hasTarget ? tooltipStyle : {}}
        >
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20">
                    <Sparkles size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">
                      {activeTutorial.name} - Step {currentStep + 1} of {activeTutorial.steps.length}
                    </p>
                    <h3 className="font-display font-semibold text-white">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={skipTutorial}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <p className="text-slate-300 leading-relaxed text-sm">
                {step.content}
              </p>
              {step.action && (
                <p className="mt-3 text-sm text-amber-400 font-medium">
                  {step.action}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-800/50 flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={isFirst}
                className={`flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer ${
                  isFirst
                    ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ChevronLeft size={16} />
                Back
              </button>

              <div className="flex items-center gap-1.5">
                {activeTutorial.steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === currentStep
                        ? "bg-amber-500"
                        : i < currentStep
                        ? "bg-amber-700"
                        : "bg-slate-600"
                    }`}
                  />
                ))}
              </div>

              <Button onClick={nextStep} size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-900">
                {isLast ? "Finish" : "Next"}
                {!isLast && <ChevronRight size={16} />}
              </Button>
            </div>
          </div>

          {/* Arrow pointing to target */}
          {hasTarget && targetRect && (
            <div
              className={`absolute w-0 h-0 ${
                step.position === "top"
                  ? "bottom-[-8px] left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-700"
                  : step.position === "bottom"
                  ? "top-[-8px] left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-slate-700"
                  : step.position === "left"
                  ? "right-[-8px] top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-slate-700"
                  : step.position === "right"
                  ? "left-[-8px] top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-slate-700"
                  : ""
              }`}
            />
          )}
        </motion.div>

        {/* Click handler to prevent interaction outside spotlight */}
        <div
          className="absolute inset-0"
          onClick={(e) => {
            // Allow clicks inside spotlight area
            if (hasTarget && targetRect) {
              const x = e.clientX;
              const y = e.clientY;
              if (
                x >= targetRect.left &&
                x <= targetRect.left + targetRect.width &&
                y >= targetRect.top &&
                y <= targetRect.top + targetRect.height
              ) {
                return;
              }
            }
            e.stopPropagation();
          }}
          style={{ pointerEvents: hasTarget ? "auto" : "none" }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
