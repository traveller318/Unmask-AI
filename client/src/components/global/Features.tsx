"use client";
import React from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { Cover } from "../ui/cover";
import { cn } from "@/lib/utils";

interface Feature {
  title: string;
  description: string;
  image: string;
  gradient: string;
}

const features: Feature[] = [
  {
    title: "AI-Powered Automation",
    description: "Transform your workflow with intelligent automation that learns and adapts to your needs. Our AI engine handles complex tasks with precision.",
    image: "/features/image1.png",
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
  },
  {
    title: "Smart Integrations",
    description: "Seamlessly connect with your favorite tools and platforms. Our platform works harmoniously with your existing tech stack.",
    image: "/features/image2.png",
    gradient: "from-cyan-500 via-teal-500 to-emerald-500",
  },
  {
    title: "Advanced Analytics",
    description: "Gain deep insights into your automation performance with real-time analytics and detailed reporting dashboards.",
    image: "/features/image3.png",
    gradient: "from-amber-500 via-orange-500 to-red-500",
  },
  {
    title: "Enterprise Security",
    description: "Rest easy with enterprise-grade security. Your data is protected with state-of-the-art encryption and compliance measures.",
    image: "/features/image4.png",
    gradient: "from-fuchsia-500 via-rose-500 to-orange-500",
  },
];

const FeatureCard = ({ feature, index }: { feature: Feature; index: number }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["0 1", "1.2 1"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.1, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [100, 0]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, y }}
      className="relative group"
    >
      <div
        className={cn(
          "flex flex-col gap-8 md:gap-12",
          index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
        )}
      >
        <div className="flex-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10">
              <h3 className={cn(
                "text-3xl md:text-4xl font-bold",
                "relative inline-block"
              )}>
                <span className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-gray-200 from-black to-gray-800">
                  {feature.title}
                </span>
                <span className={cn(
                  "absolute -z-10 inset-0 opacity-10 blur-xl bg-gradient-to-r",
                  feature.gradient
                )} />
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
                {feature.description}
              </p>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 relative">
          <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="relative h-[300px] md:h-[400px] w-full rounded-xl overflow-hidden"
          >
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r opacity-80 mix-blend-multiply",
              feature.gradient
            )} />
            <Image
              src={feature.image}
              alt={feature.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={index === 0}
            />
          </motion.div>
        </div>
      </div>

      <div className="absolute -z-10 inset-0">
        <div
          className={cn(
            "absolute w-64 h-64 blur-3xl opacity-10 bg-gradient-to-r",
            feature.gradient,
            index % 2 === 0 ? "-right-32" : "-left-32",
            "top-1/2 -translate-y-1/2"
          )}
        />
      </div>
    </motion.div>
  );
};

export const Features = () => {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-20 md:mb-28"
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-950 via-neutral-800 to-neutral-600 dark:from-white dark:via-gray-200 dark:to-gray-400">
              Powerful Features
            </span>
          </h2>
          <div className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300">
            Discover how our
            <Cover>intelligent automation</Cover>
            can transform your workflow
          </div>
        </motion.div>

        <div className="space-y-32">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};