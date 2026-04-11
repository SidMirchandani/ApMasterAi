"use client";

import { motion, useReducedMotion } from "framer-motion";

export type LandingStoryMeta = {
  title: string;
  subtitle?: string;
  /** White text for blue / saturated section backgrounds */
  tone?: "default" | "onBrand";
};

export function LandingStoryHeader({ title, subtitle, tone = "default" }: LandingStoryMeta) {
  const reduce = useReducedMotion();
  const onBrand = tone === "onBrand";

  return (
    <motion.header
      className="mb-8 max-w-3xl md:mb-10"
      initial={reduce ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 95, damping: 20, mass: 0.85 }}
    >
      <h2
        className={`font-display text-3xl font-bold capitalize tracking-tight sm:text-4xl ${
          onBrand ? "text-white" : "text-slate-900 dark:text-white"
        }`}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={`mt-2 max-w-2xl text-[15px] leading-relaxed ${
            onBrand ? "text-blue-100 dark:text-blue-100/95" : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </motion.header>
  );
}

export function LandingStoryContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 80, damping: 22, delay: 0.06 }}
    >
      {children}
    </motion.div>
  );
}
