import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
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

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
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

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const finish = () => navigate("/dashboard");

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -40, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-primary-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-accent-500" : "bg-primary-700"
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <h2 className="font-display text-2xl font-semibold text-primary-900 mb-3">
                  Begin anonymous
                </h2>
                <p className="text-neutral-600 mb-6 leading-relaxed">
                  On agoriai, you start anonymous. Your ideas speak before your
                  name does. You can choose to reveal yourself later, but only
                  when you are ready.
                </p>

                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <Avatar seed={seed} size="xl" />
                  <p className="font-display text-xl font-semibold text-primary-900">
                    {alias}
                  </p>
                  <button
                    onClick={regenerate}
                    className="flex items-center gap-2 text-sm text-neutral-500 hover:text-accent-600 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={14} /> Generate a new identity
                  </button>
                </div>

                <div className="flex justify-end mt-6">
                  <Button onClick={nextStep}>
                    Continue <ArrowRight size={16} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <h2 className="font-display text-2xl font-semibold text-primary-900 mb-3">
                  Tell us a bit about you
                </h2>
                <p className="text-neutral-600 mb-6 text-sm">
                  This helps personalize your experience. It is never tied to
                  your public identity unless you choose.
                </p>

                <div className="flex-1 space-y-5">
                  <Input
                    label="University"
                    placeholder="e.g. Stanford University"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                  />
                  <Input
                    label="Expected Graduation Year"
                    type="number"
                    placeholder="2026"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                  />
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="ghost" onClick={prevStep}>
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button onClick={nextStep}>
                    Continue <ArrowRight size={16} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <h2 className="font-display text-2xl font-semibold text-primary-900 mb-3">
                  What are you interested in?
                </h2>
                <p className="text-neutral-600 mb-6 text-sm">
                  Select the areas that matter to you. We'll personalize your
                  feed accordingly.
                </p>

                <div className="flex-1 flex flex-wrap gap-2">
                  {interests.map((interest) => {
                    const selected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                          selected
                            ? "bg-accent-500 text-primary-900"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between mt-6">
                  <Button variant="ghost" onClick={prevStep}>
                    <ArrowLeft size={16} /> Back
                  </Button>
                  <Button
                    onClick={nextStep}
                    disabled={selectedInterests.length === 0}
                  >
                    Continue <ArrowRight size={16} />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <div className="mb-6">
                  <Avatar seed={seed} size="xl" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-primary-900 mb-2">
                  Welcome to the Agora
                </h2>
                <p className="text-neutral-600 mb-2">{alias}</p>
                <div className="flex flex-wrap gap-1.5 justify-center mb-6">
                  {selectedInterests.map((i) => (
                    <Badge key={i} variant="accent">
                      {i}
                    </Badge>
                  ))}
                </div>
                <p className="text-neutral-500 text-sm mb-8">
                  Your contributions start building your presence now.
                </p>

                <Button size="lg" onClick={finish}>
                  <Check size={18} /> Enter the Agora
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
