/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { useUIStore } from "../../stores/uiStore";

// Tutorial step definition
export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string; // CSS selector for highlighting
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: string; // Description of what to do
  navigate?: string; // Route to navigate to before showing this step
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
        content: "Agoriai is a platform where your contributions speak louder than your credentials. Here, you can share experiences, ask questions, and connect with others — all while controlling your privacy.",
        position: "center",
      },
      {
        id: "dashboard",
        title: "Your Dashboard",
        content: "This is your home base. Track your contribution score, see recent activity, and discover trending discussions. Your impact grows with every interaction.",
        target: "[data-tutorial='dashboard-stats']",
        position: "bottom",
        navigate: "/dashboard",
      },
      {
        id: "feed-nav",
        title: "The Feed",
        content: "The Feed is where the community shares experiences, interview insights, career advice, and questions. Let's take a look.",
        target: "[data-tutorial='nav-feed']",
        position: "right",
      },
      {
        id: "feed-content",
        title: "Browse & Share",
        content: "Here you can read posts from the community, filter by category, search for topics, and share your own experiences. Your voice matters here.",
        target: "[data-tutorial='feed-composer']",
        position: "bottom",
        navigate: "/feed",
      },
      {
        id: "feed-filter",
        title: "Filter & Discover",
        content: "Use filters to find exactly what you need — interview experiences, career advice, or questions from peers. Sort by recent, most upvoted, or most discussed.",
        target: "[data-tutorial='feed-filters']",
        position: "bottom",
      },
      {
        id: "nexus-nav",
        title: "The Nexus",
        content: "The Nexus is an interactive network graph showing how companies, industries, and the community connect. Let's explore it.",
        target: "[data-tutorial='nav-nexus']",
        position: "right",
      },
      {
        id: "nexus-content",
        title: "Explore Connections",
        content: "Drag, zoom, and hover over nodes to discover relationships between companies and contributors. The larger the node, the more community engagement it has.",
        target: "[data-tutorial='nexus-graph']",
        position: "top",
        navigate: "/nexus",
      },
      {
        id: "messages-nav",
        title: "Messages",
        content: "Connect privately with other community members. Start anonymous and reveal your identity only when you're ready.",
        target: "[data-tutorial='nav-messages']",
        position: "right",
      },
      {
        id: "messages-content",
        title: "Private Conversations",
        content: "Your messages are private and start anonymous. When trust is established, you can choose to reveal your real identity — a meaningful moment in the Agora.",
        target: "[data-tutorial='messages-chat']",
        position: "top",
        navigate: "/messages",
      },
      {
        id: "privacy",
        title: "Your Privacy",
        content: "Click your profile to access settings. Control your visibility — from fully anonymous to real name. You decide how much to share.",
        target: "[data-tutorial='user-profile']",
        position: "top",
      },
      {
        id: "complete",
        title: "You're Ready!",
        content: "Start contributing to the Agora. Remember: your ideas matter more than your background here. Good luck on your journey!",
        position: "center",
        navigate: "/dashboard",
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
        navigate: "/feed",
      },
      {
        id: "composer",
        title: "The Post Composer",
        content: "Click here to start writing your post. You can share interview experiences, ask questions, or offer career advice.",
        target: "[data-tutorial='feed-composer']",
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
  const navigate = useNavigate();

  const startTutorial = useCallback((tutorialId: string) => {
    const tutorial = tutorials[tutorialId];
    if (tutorial) {
      setActiveTutorial(tutorial);
      setCurrentStep(0);
      // Navigate to the first step's route if specified
      if (tutorial.steps[0]?.navigate) {
        navigate(tutorial.steps[0].navigate);
      }
    }
  }, [navigate]);

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
      const nextIdx = currentStep + 1;
      const nextStepData = activeTutorial.steps[nextIdx];
      // Navigate if the next step requires a different route
      if (nextStepData?.navigate) {
        navigate(nextStepData.navigate);
      }
      setCurrentStep(nextIdx);
    } else {
      endTutorial();
    }
  }, [activeTutorial, currentStep, endTutorial, navigate]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIdx = currentStep - 1;
      const prevStepData = activeTutorial?.steps[prevIdx];
      // Navigate back if needed
      if (prevStepData?.navigate) {
        navigate(prevStepData.navigate);
      }
      setCurrentStep(prevIdx);
    }
  }, [currentStep, activeTutorial, navigate]);

  const skipTutorial = useCallback(() => {
    if (activeTutorial) {
      markComplete(activeTutorial.id);
    }
    setActiveTutorial(null);
    setCurrentStep(0);
  }, [activeTutorial, markComplete]);

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
  const darkMode = useUIStore((state) => state.darkMode);
  const { activeTutorial, currentStep, nextStep, prevStep, skipTutorial } = useTutorial();
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [isWaitingForTarget, setIsWaitingForTarget] = useState(false);
  const [tooltipPlacement, setTooltipPlacement] = useState<"top" | "bottom" | "left" | "right">("bottom");

  const step = activeTutorial?.steps[currentStep];
  const hasTarget = step?.target && step.position !== "center";

  // Find and track target element
  useEffect(() => {
    if (!step?.target || step.position === "center") {
      setTargetRect(null);
      setIsWaitingForTarget(false);
      setTooltipPlacement("bottom");
      return;
    }

    let attempts = 0;
    const maxAttempts = 30; // 3 seconds max wait

    const findAndMeasure = () => {
      const element = document.querySelector(step.target!);
      if (element) {
        setIsWaitingForTarget(false);
        const rect = element.getBoundingClientRect();
        const padding = 8;
        setTargetRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Calculate tooltip position with viewport clamping and directional fallback
        const tooltipWidth = 380;
        const tooltipHeight = 200;
        const gap = 16;
        const viewportPadding = 16;
        let top = Math.max(viewportPadding, rect.bottom + gap);
        let left = Math.max(viewportPadding, rect.left + rect.width / 2 - tooltipWidth / 2);
        let placement: "top" | "bottom" | "left" | "right" =
          step.position && step.position !== "center" ? step.position : "bottom";

        const hasRoomAbove = rect.top - tooltipHeight - gap >= viewportPadding;
        const hasRoomBelow = rect.bottom + tooltipHeight + gap <= window.innerHeight - viewportPadding;
        const hasRoomLeft = rect.left - tooltipWidth - gap >= viewportPadding;
        const hasRoomRight = rect.right + tooltipWidth + gap <= window.innerWidth - viewportPadding;

        switch (placement) {
          case "top":
            if (hasRoomAbove) {
              top = rect.top - tooltipHeight - gap;
            } else if (hasRoomBelow) {
              top = rect.bottom + gap;
              placement = "bottom";
            } else {
              top = viewportPadding;
            }
            break;
          case "bottom":
            if (hasRoomBelow) {
              top = rect.bottom + gap;
            } else if (hasRoomAbove) {
              top = rect.top - tooltipHeight - gap;
              placement = "top";
            } else {
              top = window.innerHeight - tooltipHeight - viewportPadding;
            }
            break;
          case "left":
            if (hasRoomLeft) {
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.left - tooltipWidth - gap;
            } else if (hasRoomRight) {
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.right + gap;
              placement = "right";
            } else {
              top = rect.top - tooltipHeight - gap;
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              placement = "top";
            }
            break;
          case "right":
            if (hasRoomRight) {
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.right + gap;
            } else if (hasRoomLeft) {
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.left - tooltipWidth - gap;
              placement = "left";
            } else {
              top = rect.top - tooltipHeight - gap;
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              placement = "top";
            }
            break;
        }

        left = Math.min(
          Math.max(viewportPadding, left),
          window.innerWidth - tooltipWidth - viewportPadding
        );
        top = Math.min(
          Math.max(viewportPadding, top),
          window.innerHeight - tooltipHeight - viewportPadding
        );

        setTooltipStyle({ top, left });
        setTooltipPlacement(placement);
      } else {
        attempts++;
        if (attempts <= maxAttempts) {
          setIsWaitingForTarget(true);
        }
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

  // While waiting for a target element (e.g. during page navigation),
  // show the tooltip centered instead of hiding the overlay entirely
  const showCentered = (isWaitingForTarget && hasTarget && !targetRect);
  const effectiveHasTarget = hasTarget && !showCentered;

  const isFirst = currentStep === 0;
  const isLast = currentStep === activeTutorial.steps.length - 1;
  const overlayFill = darkMode ? "rgba(2, 6, 23, 0.8)" : "rgba(15, 23, 42, 0.46)";

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
            <filter id="tutorial-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {effectiveHasTarget && targetRect && (
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
          <rect
            width="100%"
            height="100%"
            fill={overlayFill}
            mask="url(#spotlight-mask)"
            style={{ backdropFilter: "blur(4px)" }}
          />
        </svg>

        {/* Spotlight glow ring */}
        {effectiveHasTarget && targetRect && (
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

        {/* Click handler to prevent interaction outside spotlight - rendered BEFORE tooltip */}
        <div
          className="absolute inset-0"
          onClick={(e) => {
            if (effectiveHasTarget && targetRect) {
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
          style={{ pointerEvents: effectiveHasTarget ? "auto" : "none" }}
        />

        {/* Tutorial tooltip card - rendered AFTER click handler so it's on top */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`absolute z-20 w-[380px] max-w-[calc(100vw-32px)] ${
            !effectiveHasTarget ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
          }`}
          style={effectiveHasTarget ? tooltipStyle : {}}
        >
          <div className="mosaic-panel rounded-2xl shadow-2xl border border-slate-200/70 dark:border-slate-700/70 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-200/70 dark:border-slate-700/70">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20">
                    <Sparkles size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {activeTutorial.name} — Step {currentStep + 1} of {activeTutorial.steps.length}
                    </p>
                    <h3 className="font-display font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={skipTutorial}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                {step.content}
              </p>
              {step.action && (
                <p className="mt-3 text-sm text-amber-400 font-medium">
                  {step.action}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-800/50 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={isFirst}
                className={`flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer ${
                  isFirst
                    ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                        : "bg-slate-400 dark:bg-slate-600"
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
          {effectiveHasTarget && targetRect && (
            <div
              className={`absolute w-0 h-0 ${
                tooltipPlacement === "top"
                  ? `bottom-[-8px] left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${
                      darkMode ? "border-t-slate-700" : "border-t-slate-300"
                    }`
                  : tooltipPlacement === "bottom"
                  ? `top-[-8px] left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent ${
                      darkMode ? "border-b-slate-700" : "border-b-slate-300"
                    }`
                  : tooltipPlacement === "left"
                  ? `right-[-8px] top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent ${
                      darkMode ? "border-l-slate-700" : "border-l-slate-300"
                    }`
                  : tooltipPlacement === "right"
                  ? `left-[-8px] top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent ${
                      darkMode ? "border-r-slate-700" : "border-r-slate-300"
                    }`
                  : ""
              }`}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
