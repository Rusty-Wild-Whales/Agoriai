import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, ArrowRight, ArrowLeft, Check, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { generateRandomAnonName } from "../utils/helpers";
import { StarField } from "./Landing";
import { agoraApi } from "../services/agoraApi";
import { useAuthStore } from "../stores/authStore";
import { findUniversityMatches, isKnownUniversity } from "../data/universities";

const interests = [
  "Software Engineering",
  "Quant Trading",
  "Cybersecurity",
  "Cloud Infrastructure",
  "Machine Learning",
  "Artificial Intelligence",
  "Robotics",
  "Biotech",
  "Finance",
  "Investment Banking",
  "Private Equity",
  "Venture Capital",
  "Consulting",
  "Data Science",
  "Design",
  "UX Research",
  "Product Management",
  "Marketing",
  "Growth",
  "Sales",
  "Community",
  "Public Policy",
  "Law",
  "Medicine",
  "Education",
  "Operations",
  "Research",
  "Entrepreneurship",
];

type AuthMode = "register" | "login";
type EmailStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";
type OnboardingIdentity = {
  alias: string;
  avatarSeed: string;
};

function isAcademicEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return false;
  }

  const domain = normalized.split("@")[1] ?? "";
  if (!domain) {
    return false;
  }

  return (
    domain.endsWith(".edu") ||
    /\.edu\.[a-z]{2,3}$/i.test(domain) ||
    /\.ac\.[a-z]{2,3}$/i.test(domain) ||
    /\.uni\.[a-z]{2,3}$/i.test(domain)
  );
}

function createIdentitySeed() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `onboard-${crypto.randomUUID()}`;
  }
  return `onboard-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createRandomIdentity(previous?: OnboardingIdentity): OnboardingIdentity {
  const alias = generateRandomAnonName(previous?.alias);
  let avatarSeed = createIdentitySeed();
  let attempts = 0;

  while (previous && avatarSeed === previous.avatarSeed && attempts < 4) {
    avatarSeed = createIdentitySeed();
    attempts += 1;
  }

  return { alias, avatarSeed };
}

export default function Onboarding() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [mode, setMode] = useState<AuthMode>("register");
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [identity, setIdentity] = useState<OnboardingIdentity>(() => createRandomIdentity());
  const [university, setUniversity] = useState("");
  const [gradYear, setGradYear] = useState("2026");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [schoolEmail, setSchoolEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [realName, setRealName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [showUniversityOptions, setShowUniversityOptions] = useState(false);

  const alias = identity.alias;
  const seed = identity.avatarSeed;

  const resetFlow = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    setStep(0);
    setDirection(1);
    if (nextMode === "register") {
      setIdentity((previous) => createRandomIdentity(previous));
    }
    setAuthError(null);
    setEmailStatus("idle");
    setEmailStatusMessage(null);
  }, []);

  const regenerate = useCallback(() => {
    setIdentity((previous) => createRandomIdentity(previous));
  }, []);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const normalizedEmail = schoolEmail.trim().toLowerCase();
  const validEmail = isAcademicEmail(normalizedEmail);
  const validPassword = password.length >= 12;
  const validRegistrationCredentials = validEmail && validPassword;
  const validLoginCredentials = validEmail && password.length > 0;
  const universityMatches = useMemo(() => findUniversityMatches(university), [university]);
  const universityIsCustom = Boolean(university.trim()) && !isKnownUniversity(university);

  const canAdvance = () => {
    if (step === 1) {
      return (
        validRegistrationCredentials &&
        password === confirmPassword &&
        emailStatus === "available"
      );
    }
    if (step === 2) {
      return Boolean(realName.trim()) && Boolean(university.trim()) && Boolean(gradYear.trim());
    }
    if (step === 3) return selectedInterests.length > 0;
    return true;
  };

  useEffect(() => {
    if (mode !== "register" || step !== 1) {
      return;
    }

    if (!normalizedEmail) {
      setEmailStatus("idle");
      setEmailStatusMessage(null);
      return;
    }

    if (!validEmail) {
      setEmailStatus("invalid");
      setEmailStatusMessage("Enter a valid academic email.");
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setEmailStatus("checking");
      setEmailStatusMessage("Checking email availability...");

      void agoraApi
        .checkEmailAvailability(normalizedEmail)
        .then((result) => {
          if (cancelled) return;

          if (!result.validFormat) {
            setEmailStatus("invalid");
            setEmailStatusMessage("Enter a valid academic email.");
            return;
          }

          if (!result.available) {
            setEmailStatus("taken");
            setEmailStatusMessage("An account with this email already exists.");
            return;
          }

          setEmailStatus("available");
          setEmailStatusMessage("Email is available.");
        })
        .catch(() => {
          if (cancelled) return;
          setEmailStatus("error");
          setEmailStatusMessage("Could not verify email right now. Please try again.");
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, normalizedEmail, step, validEmail]);

  const nextStep = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleLogin = async () => {
    if (!validLoginCredentials) {
      setAuthError("Enter a valid academic email and your password.");
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
    if (!validRegistrationCredentials) {
      setAuthError("Enter a valid academic email and a strong password.");
      return;
    }
    if (emailStatus === "taken") {
      setAuthError("An account with this academic email already exists.");
      return;
    }
    if (emailStatus === "checking" || emailStatus === "error" || emailStatus === "invalid") {
      setAuthError("Please resolve your email before continuing.");
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
        realName: realName.trim(),
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
          Use your academic email (including `.edu`, `.edu.xx`, `.ac.xx`, `.uni.xx`) and a strong password (12+ characters).
        </p>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">School Email</label>
          <div className="relative">
            <input
              type="email"
              placeholder="you@university.edu"
              value={schoolEmail}
              onChange={(event) => setSchoolEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 pr-10 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
            />
            {emailStatus === "checking" && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
            )}
            {emailStatus === "available" && (
              <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
            )}
            {(emailStatus === "taken" || emailStatus === "invalid" || emailStatus === "error") && (
              <AlertCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400" />
            )}
          </div>
          {emailStatusMessage && (
            <p
              className={`mt-2 text-xs ${
                emailStatus === "available"
                  ? "text-emerald-400"
                  : emailStatus === "checking"
                    ? "text-slate-400"
                    : "text-rose-300"
              }`}
            >
              {emailStatusMessage}
            </p>
          )}
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
          <label className="mb-2 block text-sm font-medium text-slate-200">Full Name</label>
          <input
            type="text"
            placeholder="Jane Doe"
            value={realName}
            onChange={(event) => setRealName(event.target.value)}
            className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
          />
          <p className="mt-2 text-xs text-slate-400">
            Your real name stays private unless you choose to reveal identity later.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">University</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Start typing your school..."
              value={university}
              onFocus={() => setShowUniversityOptions(true)}
              onBlur={() => {
                setTimeout(() => setShowUniversityOptions(false), 140);
              }}
              onChange={(event) => setUniversity(event.target.value)}
              className="w-full rounded-xl border border-slate-600/75 bg-slate-900/55 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-amber-500/60 focus:outline-none"
            />

            {showUniversityOptions && universityMatches.length > 0 && (
              <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-600/80 bg-slate-900/95 p-1 shadow-xl backdrop-blur-sm">
                {universityMatches.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setUniversity(option);
                      setShowUniversityOptions(false);
                    }}
                    className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {universityIsCustom
              ? "Custom school detected. You can continue with this value."
              : "Pick from suggestions or enter a custom college/university."}
          </p>
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

      <div className="flex max-h-[240px] flex-1 content-start flex-wrap gap-2 overflow-y-auto pr-1">
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
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 text-center"
          >
            <span className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">agoriai</span>
          </motion.div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-2 backdrop-blur-sm">
            <button
              onClick={() => resetFlow("register")}
              className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-amber-500 text-slate-900 shadow-sm shadow-amber-500/20"
                  : "text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              Create account
            </button>
            <button
              onClick={() => resetFlow("login")}
              className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "bg-amber-500 text-slate-900 shadow-sm shadow-amber-500/20"
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
                className="flex min-h-[500px] flex-col rounded-3xl border border-slate-600/80 bg-slate-900/82 p-7 shadow-[0_18px_48px_rgba(2,6,23,0.58)] backdrop-blur-md md:p-8"
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
              className="rounded-3xl border border-slate-600/80 bg-slate-900/82 p-8 shadow-[0_18px_48px_rgba(2,6,23,0.58)] backdrop-blur-md"
            >
              <h2 className="mb-2 font-display text-2xl font-semibold text-white">Welcome back</h2>
              <p className="mb-6 text-sm text-slate-400">Sign in with your academic email and password.</p>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">School Email</label>
                  <input
                    type="email"
                    placeholder="you@university.edu"
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
                disabled={submitting || !validLoginCredentials}
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
