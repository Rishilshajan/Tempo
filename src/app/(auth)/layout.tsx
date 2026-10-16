import Image from "next/image";
import { Sparkles, ShieldCheck, Clock } from "lucide-react";

// Auth pages read the session cookie (to bounce signed-in users), so never
// prerender them.
export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Sparkles,
    title: "An agentic morning briefing",
    body: "Wake up to a plan tuned to your peak focus window.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing important slips",
    body: "Tempo watches for slippage and cascade risk before you do.",
  },
  {
    icon: Clock,
    title: "Protect your deep work",
    body: "High-load tasks cluster into your morning focus hours.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full bg-background">
      {/* Brand panel - desktop only. `shrink-0` + the form's `flex-1` keeps a
          clean 50/50 split (no w-full/w-1/2 flex conflict). */}
      <aside className="relative hidden w-1/2 shrink-0 flex-col justify-center overflow-hidden bg-gradient-to-br from-[#4c9a78] via-[#1d7a57] to-[#0e4f39] p-10 text-white lg:flex xl:p-14">
        {/* soft decorative glows */}
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#7bc96f]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-72 rounded-full bg-white/10 blur-3xl" />

        {/* Logo + hero as one vertically-centered group */}
        <div className="relative max-w-md">
          <div className="inline-flex w-fit items-center rounded-2xl bg-white px-6 py-3.5 shadow-lg shadow-black/10">
            <Image
              src="/Tempo_Logo_original.png"
              alt="Tempo"
              width={866}
              height={288}
              priority
              className="h-10 w-auto select-none"
            />
          </div>

          <h1 className="mt-12 text-balance text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
            Your day, orchestrated.
          </h1>
          <p className="mt-5 text-pretty text-base leading-relaxed text-white/85">
            Tempo is an agentic task manager that co-manages your commitments -
            so the important work never quietly slides to tomorrow.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-white/75">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer - pinned bottom-left, out of the centering flow */}
        <p className="absolute bottom-10 left-10 text-sm text-white/60 xl:left-14">
          Keeps your day in rhythm.
        </p>
      </aside>

      {/* Form panel - fills the remaining width */}
      <section className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Logo - mobile / tablet only (the panel carries it on desktop) */}
          <div className="mb-10 flex justify-center lg:hidden">
            <Image
              src="/Tempo_Logo_original.png"
              alt="Tempo"
              width={866}
              height={288}
              priority
              className="h-14 w-auto select-none sm:h-16"
            />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
