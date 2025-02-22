import  Hero  from "@/components/global/Hero";
import Image from "next/image";
import Navbar from "@/components/global/Navbar";
import Companies from "@/components/global/Companies";
import { Features } from "@/components/global/Features";
import { Testimonials } from "@/components/global/Testimonials";
import { Footer } from "@/components/global/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white overflow-hidden font-inter">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <Footer />
    </div>
  );
}
