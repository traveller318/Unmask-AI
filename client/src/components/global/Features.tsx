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
    title: "Audio-Visual Deepfake Detection",
    description: "Leverages face distortion, frame anomalies, and voice mismatch detection to accurately identify deepfake content.",
    image: "https://miro.medium.com/v2/resize:fit:875/0*3dX7eUHgut3acIvb.jpg",
    gradient: "from-blue-500 via-indigo-500 to-purple-500",
  },
  {
    title: "Generalized Deepfake Report",
    description: "Integrates all detection models to generate a comprehensive confidence score for accurate deepfake analysis.",
    image: "https://analyticsindiamag.com/wp-content/uploads/2020/04/Learn-Facial-Recognition-scaled.jpg",
    gradient: "from-green-500 via-teal-500 to-cyan-500",
  },
  {
    title: "Real-Time Livestream & Social Media Detection",
    description: "Detects deepfakes on live streaming platforms and social media in real time using our powerful browser extension.",
    image: "https://i.kym-cdn.com/news/posts/original/000/003/023/cover4.jpg",
    gradient: "from-red-500 via-pink-500 to-purple-500",
  },
  {
    title: "Live Sentiment Analysis",
    description: "Analyzes facial expressions and voice tone in real time to detect emotional cues and potential synthetic behaviors.",
    image: "https://www.tasteofcinema.com/wp-content/uploads/2015/03/Filth.jpeg",
    gradient: "from-purple-500 via-fuchsia-500 to-pink-500",
  },
  {
    title: "API Integration",
    description: "Easily integrate deepfake detection into your platform by posting image and video URLs to our AI-powered API.",
    image: "https://fiverr-res.cloudinary.com/images/t_main1,q_auto,f_auto,q_auto,f_auto/gigs/390367038/original/2b30c52ead4d270e9f47912e7440aa132085016c/do-restful-api-integrations.jpg",
    gradient: "from-yellow-500 via-amber-500 to-orange-500",
  }
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