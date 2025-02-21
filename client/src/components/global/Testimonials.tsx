import { cn } from "@/lib/utils";
import { Marquee } from "@/components/magicui/marquee";

const reviews = [
  {
    name: "Jack Thompson",
    username: "@jack_builds",
    body: "This tool has completely transformed how I work. The automation features are incredible, and the interface is so intuitive. It's become an essential part of my daily workflow.",
    img: "https://avatar.vercel.sh/jack",
  },
  {
    name: "Sarah Chen",
    username: "@sarah_codes",
    body: "I've tried many similar tools, but this one stands out. The attention to detail and the powerful features make it a game-changer for my development process.",
    img: "https://avatar.vercel.sh/sarah",
  },
  {
    name: "Michael Rodriguez",
    username: "@mike_dev",
    body: "The productivity boost I've gotten from this tool is unreal. It's like having an extra team member who handles all the tedious tasks perfectly.",
    img: "https://avatar.vercel.sh/mike",
  },
  {
    name: "Emma Wilson",
    username: "@emma_builds",
    body: "Absolutely love how this tool streamlines my workflow. The automations are brilliant, and it's saved me countless hours of work.",
    img: "https://avatar.vercel.sh/emma",
  },
  {
    name: "David Park",
    username: "@david_tech",
    body: "This is exactly what I've been looking for. The features are well thought out, and it integrates perfectly with my existing tools.",
    img: "https://avatar.vercel.sh/david",
  },
];
const column1 = reviews.slice(0, 2);
const column2 = reviews.slice(2, 4);
const column3 = reviews.slice(1, 3);

const ReviewCard = ({
  img,
  name,
  username,
  body,
}: {
  img: string;
  name: string;
  username: string;
  body: string;
}) => {
  return (
    <figure
      className={cn(
        "relative w-[350px] cursor-pointer overflow-hidden rounded-2xl border p-8 mb-8",
        // light styles
        "border-gray-950/[.1] bg-white/5 hover:bg-white/10 backdrop-blur-sm",
        // dark styles
        "dark:border-gray-50/[.1] dark:bg-background-0/10 dark:hover:bg-gray-950/20",
        "transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl",
        "group"
      )}
    >
      <div className="flex flex-row items-center gap-4 mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/0 rounded-full blur-md group-hover:blur-xl transition-all duration-500" />
          <img
            className="relative rounded-full border-2 border-primary/20 group-hover:border-primary/40 transition-all duration-500"
            width="56"
            height="56"
            alt=""
            src={img}
          />
        </div>
        <div className="flex flex-col">
          <figcaption className="text-lg font-semibold text-foreground">
            {name}
          </figcaption>
          <p className="text-sm font-medium text-foreground/60">{username}</p>
        </div>
      </div>
      <blockquote className="text-lg leading-relaxed text-foreground/80 font-medium">
        "{body}"
      </blockquote>
    </figure>
  );
};
export const Testimonials = () => {
  return (
    <section className="w-full py-32 bg-gradient-to-b from-background via-background/50 to-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-24">
          <h2 className="text-5xl md:text-6xl font-extrabold mb-6 text-foreground">
            Loved by{" "}
            <span className="bg-gradient-to-r from-blue-500 to-blue-300 text-transparent/25 bg-clip-text">
              Developers
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-foreground/70">
            Join thousands of developers who have already transformed their
            workflow.
          </p>
        </div>

        <div className="relative flex h-[800px] w-full flex-row items-center justify-center gap-12 overflow-hidden">
          <Marquee pauseOnHover vertical className="[--duration:40s] px-4">
            {column1.map((review) => (
              <ReviewCard key={review.username} {...review} />
            ))}
          </Marquee>
          <Marquee
            reverse
            pauseOnHover
            vertical
            className="[--duration:35s] px-4"
          >
            {column2.map((review) => (
              <ReviewCard key={review.username} {...review} />
            ))}
          </Marquee>
          <Marquee pauseOnHover vertical className="[--duration:30s] px-4">
            {column3.map((review) => (
              <ReviewCard key={review.username} {...review} />
            ))}
          </Marquee>

          {/* Gradient overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-background"></div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background"></div>
        </div>
      </div>
    </section>
  );
};
