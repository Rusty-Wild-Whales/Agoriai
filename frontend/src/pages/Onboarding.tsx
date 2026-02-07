import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { generateAnonName } from "../utils/helpers";
import { StarField } from "./Landing";
import { agoraApi } from "../services/agoraApi";
import { useAuthStore } from "../stores/authStore";

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

type AuthMode = "register" | "login";

export default function Onboarding() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [mode, setMode] = useState<AuthMode>("register");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [seedCounter, setSeedCounter] = useState(0);
  const [university, setUniversity] = useState("");
  const [gradYear, setGradYear] = useState("2026");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [schoolEmail, setSchoolEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const seed = `onboard-${seedCounter}`;
  const alias = generateAnonName(seed);

  const resetFlow = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    setStep(0);
    setDirection(1);
    setAuthError(null);
  }, []);

  const regenerate = () => setSeedCounter((value) => value + 1);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const normalizedEmail = schoolEmail.trim().toLowerCase();
  const validEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
    /\.(edu|ac\.[a-z]{2,3})$/i.test(normalizedEmail);
  const validPassword = password.length >= 12;
  const validCredentials = validEmail && validPassword;

  const canAdvance = () => {
    if (step === 1) return validCredentials && password === confirmPassword;
    if (step === 2) return Boolean(university.trim()) && Boolean(gradYear.trim());
    if (step === 3) return selectedInterests.length > 0;
    return true;
  };

  const nextStep = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleLogin = async () => {
    if (!validCredentials) {
      setAuthError("Enter a valid school email and password.");
      return;
    }

    setSubmitting(true);
    setAuthError(null);
    try {
      const response = await agoraApi.login({
        schoolEmail: schoolEmail.trim().toLowerCase(),
        password,
      });
      setAuth(response);
      navigate("/dashboard");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!validCredentials) {
      setAuthError("Enter a valid school email and a strong password.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    const graduationYear = Number(gradYear);
    if (!Number.isInteger(graduationYear)) {
      setAuthError("Graduation year is invalid.");
      return;
    }

    setSubmitting(true);
    setAuthError(null);
    try {
      const response = await agoraApi.register({
        schoolEmail: schoolEmail.trim().toLowerCase(),
        password,
        university: university.trim(),
        graduationYear,
        fieldsOfInterest: selectedInterests.map((interest) => interest.toLowerCase()),
        anonAlias: alias,
        anonAvatarSeed: seed,
      });
      setAuth(response);
      navigate("/dashboard");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (value: number) => ({
      x: value > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (value: number) => ({
      x: value < 0 ? 60 : -60,
      opacity: 0,
    }),
  };

  const registerSteps = [
    <motion.div
      key="step0"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-1 flex-col"
    >
      <div className="mb-6">
        <h2 className="mb-3 font-display text-2xl font-semibold text-white">Begin Anonymous</h2>
        <p className="text-sm leading-relaxed text-slate-400">
          Your ideas speak first in the Agora. You control identity reveal later.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <Avatar seed={seed} size="xl" />
        <p className="font-display text-xl font-semibold text-white">{alias}</p>
        <button
          onClick={regenerate}
          className="flex cursor-pointer items-center gap-2 text-sm text-slate-500 transition-colors hover:text-amber-400"
        >
          <RefreshCw size={14} /> Generate a new identity
        </button>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={nextStep} className="bg-amber-500 text-slate-900 hover:bg-amber-400">
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    <motion.div
      key="step1"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-1 flex-col"
    >
      <div className="mb-6">
        <h2 className="mb-3 font-display text-2xl font-semibold text-white">Secure Your Account</h2>
        <p className="text-sm text-slate-400">
          Use your school email and a strong password (12+ characters).
        </p>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">School Email</label>
          <input
            type="email"
            placeholder="you@school.edu"
            value={schoolEmail}
            onChange={(event) => setSchoolEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">Password</label>
          <input
            type="password"
            placeholder="At least 12 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">Confirm Password</label>
          <input
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={prevStep} className="text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!canAdvance()}
          className="bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    <motion.div
      key="step2"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-1 flex-col"
    >
      <div className="mb-6">
        <h2 className="mb-3 font-display text-2xl font-semibold text-white">Tell Us About You</h2>
        <p className="text-sm text-slate-400">This helps personalize your feed and Nexus graph.</p>
      </div>

      <div className="flex-1 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">University</label>
          <input
            type="text"
            placeholder="e.g. Stanford University"
            value={university}
            onChange={(event) => setUniversity(event.target.value)}
            className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">Expected Graduation Year</label>
          <input
            type="number"
            placeholder="2026"
            value={gradYear}
            onChange={(event) => setGradYear(event.target.value)}
            className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={prevStep} className="text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!canAdvance()}
          className="bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    <motion.div
      key="step3"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-1 flex-col"
    >
      <div className="mb-6">
        <h2 className="mb-3 font-display text-2xl font-semibold text-white">What Interests You?</h2>
        <p className="text-sm text-slate-400">Select the topics you want to see first.</p>
      </div>

      <div className="flex flex-1 content-start flex-wrap gap-2">
        {interests.map((interest) => {
          const selected = selectedInterests.includes(interest);
          return (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "bg-amber-500 text-slate-900"
                  : "border border-slate-600/75 bg-slate-900/55 text-slate-300 hover:border-slate-400"
              }`}
            >
              {interest}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={prevStep} className="text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!canAdvance()}
          className="bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </div>
    </motion.div>,

    <motion.div
      key="step4"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <Avatar seed={seed} size="xl" />
      <h2 className="mt-6 mb-2 font-display text-2xl font-semibold text-white">Welcome to the Agora</h2>
      <p className="mb-2 text-slate-400">{alias}</p>
      <div className="mb-6 flex flex-wrap justify-center gap-1.5">
        {selectedInterests.map((interest) => (
          <span
            key={interest}
            className="rounded-full border border-amber-500/25 bg-amber-500/15 px-3 py-1 text-xs text-amber-400"
          >
            {interest}
          </span>
        ))}
      </div>
      <p className="mb-8 text-sm text-slate-500">Your contributions start building your presence now.</p>

      <Button
        onClick={handleRegister}
        disabled={submitting}
        className="bg-amber-500 px-8 text-slate-900 hover:bg-amber-400 disabled:opacity-60"
      >
        <Check size={16} /> {submitting ? "Creating account..." : "Enter the Agora"}
      </Button>
    </motion.div>,
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 overflow-hidden bg-[#060e1b]">
        <StarField />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.16),transparent_46%),radial-gradient(circle_at_80%_12%,rgba(59,130,246,0.18),transparent_54%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-center"
          >
            <span className="font-display text-2xl font-bold tracking-tight text-white">agoriai</span>
          </motion.div>

          <div className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-slate-900/60 p-1.5">
            <button
              onClick={() => resetFlow("register")}
              className={`cursor-pointer rounded-lg px-4 py-2 text-sm transition-colors ${
                mode === "register"
                  ? "bg-amber-500 text-slate-900"
                  : "text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              Create account
            </button>
            <button
              onClick={() => resetFlow("login")}
              className={`cursor-pointer rounded-lg px-4 py-2 text-sm transition-colors ${
                mode === "login"
                  ? "bg-amber-500 text-slate-900"
                  : "text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              Sign in
            </button>
          </div>

          {mode === "register" ? (
            <>
              <div className="mb-6 flex gap-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/85">
                    <motion.div
                      className="h-full bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: index <= step ? "100%" : "0%" }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex min-h-[520px] flex-col rounded-2xl border border-slate-700/70 bg-slate-900/78 p-8 shadow-[0_16px_44px_rgba(2,6,23,0.52)] backdrop-blur-md"
              >
                <AnimatePresence mode="wait" custom={direction}>
                  {registerSteps[step]}
                </AnimatePresence>
              </motion.div>

              <p className="mt-4 text-center text-sm text-slate-400">Step {step + 1} of 5</p>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-700/70 bg-slate-900/78 p-8 shadow-[0_16px_44px_rgba(2,6,23,0.52)] backdrop-blur-md"
            >
              <h2 className="mb-2 font-display text-2xl font-semibold text-white">Welcome back</h2>
              <p className="mb-6 text-sm text-slate-400">Sign in with your school email and password.</p>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">School Email</label>
                  <input
                    type="email"
                    placeholder="you@school.edu"
                    value={schoolEmail}
                    onChange={(event) => setSchoolEmail(event.target.value)}
                    className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Password</label>
                  <input
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
                  />
                </div>
              </div>

              <Button
                onClick={handleLogin}
                disabled={submitting || !validCredentials}
                className="mt-6 w-full bg-amber-500 text-slate-900 hover:bg-amber-400 disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
            </motion.div>
          )}

          {authError && (
            <p className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {authError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
