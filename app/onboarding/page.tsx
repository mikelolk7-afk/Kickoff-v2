"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const STEPS = [
  {
    title: "Welcome to Kickoff Manager!",
    description:
      "You've just created your club. Here's a quick guide to get you started on your journey from Sunday League to the Premier League.",
    icon: "&#9917;",
  },
  {
    title: "Build Your Squad",
    description:
      "Visit the Squad page to view your 18 starting players. Check their stats, positions, and contracts. You'll want to keep an eye on morale and form.",
    icon: "&#128101;",
  },
  {
    title: "Set Your Tactics",
    description:
      "Head to the Tactics page to choose your formation, set your mentality, and assign player positions. Your tactical choices directly affect match outcomes.",
    icon: "&#127919;",
  },
  {
    title: "Compete in Leagues",
    description:
      "Matches are simulated daily. Check the League page for standings, fixtures, and results. Finish in the top 2 to earn promotion to a higher division!",
    icon: "&#127942;",
  },
  {
    title: "Transfer Market & Scouting",
    description:
      "List players for sale, make bids on others, and send your scouts to discover hidden talent. Build the ultimate squad over time.",
    icon: "&#128176;",
  },
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-panel border border-border rounded-xl p-8 text-center">
          <div className="text-5xl mb-4" dangerouslySetInnerHTML={{ __html: current.icon }} />
          <h2 className="text-2xl font-bold mb-3">{current.title}</h2>
          <p className="text-muted mb-8">{current.description}</p>

          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full ${
                  i <= step ? "bg-primary" : "bg-gray-700"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2.5 border border-border text-foreground rounded-lg font-medium hover:bg-surface/50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) {
                  router.push("/dashboard");
                } else {
                  setStep(step + 1);
                }
              }}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {isLast ? "Start Playing" : "Next"}
            </button>
          </div>

          {!isLast && (
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 text-subtle text-sm hover:text-muted"
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
