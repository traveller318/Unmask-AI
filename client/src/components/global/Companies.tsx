import { Marquee } from "@/components/magicui/marquee";
import Image from "next/image";

export default function Companies() {
  const companies = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <section className="mt-5 py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-2xl font-semibold text-blue-600 mb-8">
          Trusted by Industry Leaders
        </h2>
        <Marquee className="py-4" pauseOnHover>
          {companies.map((num) => (
            <div key={num} className="mx-6">
              <Image
                src={`/companies/${num}.png`}
                alt={`Company ${num}`}
                width={120}
                height={40}
                className="object-contain h-10 grayscale hover:grayscale-0 hover:drop-shadow-md transition-all duration-200"
              />
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
