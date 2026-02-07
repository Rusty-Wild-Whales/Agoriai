import { AnimatePresence, motion } from "framer-motion";

type GlassShatterOverlayProps = {
  active: boolean;
  variant?: "chat" | "settings";
};

type Shard = {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  clipPath: string;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
};

function noise(seed: number) {
  const x = Math.sin(seed * 97.137) * 43758.5453;
  return x - Math.floor(x);
}

const shards: Shard[] = Array.from({ length: 28 }, (_, index) => {
  const col = index % 7;
  const row = Math.floor(index / 7);
  const centerX = (col + 0.5) * (100 / 7);
  const centerY = (row + 0.5) * (100 / 4);
  const fromCenterX = centerX - 50;
  const fromCenterY = centerY - 50;
  const spread = 96 + noise(index + 1) * 88;
  const driftX = Math.round((fromCenterX / 50) * spread + (noise(index + 11) - 0.5) * 70);
  const driftY = Math.round((fromCenterY / 50) * spread + (noise(index + 17) - 0.5) * 82);
  const rotate = Math.round((noise(index + 23) - 0.5) * 84 + (fromCenterX / 50) * 42);
  const width = 14 + noise(index + 29) * 12;
  const height = 18 + noise(index + 31) * 15;
  const p1 = `${Math.round(8 + noise(index + 37) * 18)}% ${Math.round(noise(index + 41) * 14)}%`;
  const p2 = `${Math.round(92 - noise(index + 43) * 13)}% ${Math.round(6 + noise(index + 47) * 24)}%`;
  const p3 = `${Math.round(100 - noise(index + 53) * 20)}% ${Math.round(66 + noise(index + 59) * 30)}%`;
  const p4 = `${Math.round(58 + noise(index + 61) * 30)}% ${Math.round(96 - noise(index + 67) * 8)}%`;
  const p5 = `${Math.round(6 + noise(index + 71) * 30)}% ${Math.round(80 + noise(index + 73) * 18)}%`;
  const p6 = `${Math.round(noise(index + 79) * 12)}% ${Math.round(24 + noise(index + 83) * 40)}%`;
  const delay = 0.015 + noise(index + 89) * 0.19;

  return {
    id: index + 1,
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
    clipPath: `polygon(${p1}, ${p2}, ${p3}, ${p4}, ${p5}, ${p6})`,
    dx: driftX,
    dy: driftY,
    rotate,
    delay,
  };
});

export function GlassShatterOverlay({ active, variant = "settings" }: GlassShatterOverlayProps) {
  const duration = variant === "chat" ? 2.85 : 2.35;
  const crackDuration = variant === "chat" ? 0.62 : 0.54;
  const rayCount = variant === "chat" ? 16 : 12;
  const rayAngles = Array.from({ length: rayCount }, (_, idx) => (360 / rayCount) * idx + noise(idx + 401) * 10);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="glass-shatter"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration }}
          className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0.92 }}
            animate={{ opacity: 0 }}
            transition={{ duration: crackDuration }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.2)_30%,rgba(255,255,255,0.05)_54%,transparent_72%)]"
          />

          <motion.div
            initial={{ opacity: 0.76, scale: 0.98 }}
            animate={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: crackDuration, ease: [0.2, 0.85, 0.2, 1] }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0.3)_42%,transparent_72%)]"
          />

          <motion.div
            initial={{ opacity: 0.72, x: "-18%" }}
            animate={{ opacity: 0 }}
            transition={{ duration: crackDuration + 0.1 }}
            className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.75),rgba(255,255,255,0.1)_44%,transparent_76%)]"
          />

          {rayAngles.map((angle, idx) => (
            <motion.span
              key={`ray-${angle}`}
              initial={{ opacity: 0.9, scaleY: 0.2 }}
              animate={{ opacity: 0, scaleY: 1 }}
              transition={{ duration: crackDuration, delay: idx * 0.01 }}
              style={{
                transformOrigin: "50% 50%",
                transform: `rotate(${angle}deg)`,
              }}
              className="absolute left-1/2 top-1/2 h-[2px] w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.6)_40%,rgba(255,255,255,0.18)_58%,transparent_80%)]"
            />
          ))}

          {shards.map((shard) => (
            <motion.div
              key={shard.id}
              initial={{ opacity: 0.9, x: 0, y: 0, rotate: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: shard.dx,
                y: shard.dy,
                rotate: shard.rotate,
                scale: 0.66,
              }}
              transition={{
                duration: duration * 0.9,
                delay: shard.delay,
                ease: [0.16, 0.8, 0.2, 1],
              }}
              style={{
                left: `${shard.left}%`,
                top: `${shard.top}%`,
                width: `${shard.width}%`,
                height: `${shard.height}%`,
                clipPath: shard.clipPath,
              }}
              className="absolute border border-white/35 bg-white/14 shadow-[0_0_24px_rgba(255,255,255,0.2)] backdrop-blur-[1px]"
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
