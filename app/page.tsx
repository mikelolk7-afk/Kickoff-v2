import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-4">
          <span className="text-primary">Kickoff</span>{" "}
          <span className="text-white">Manager</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-xl mb-8">
          Build your club. Set your tactics. Compete in live leagues.
          The browser-based football management game.
        </p>

        <div className="flex gap-4">
          <Link
            href="/register"
            className="px-8 py-3 bg-primary text-white rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors"
          >
            Create Your Club
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-gray-700 text-gray-300 rounded-lg font-semibold text-lg hover:bg-gray-800/50 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-panel rounded-lg border border-gray-800 p-6 text-center">
          <div className="text-3xl mb-3">&#9917;</div>
          <h3 className="font-semibold mb-2">Live Matches</h3>
          <p className="text-gray-400 text-sm">
            Daily simulated matches with full replays, stats, and event-by-event action.
          </p>
        </div>
        <div className="bg-panel rounded-lg border border-gray-800 p-6 text-center">
          <div className="text-3xl mb-3">&#128200;</div>
          <h3 className="font-semibold mb-2">10 Divisions</h3>
          <p className="text-gray-400 text-sm">
            Climb from Sunday League to the Premier League. Promotions, relegations, and cup glory.
          </p>
        </div>
        <div className="bg-panel rounded-lg border border-gray-800 p-6 text-center">
          <div className="text-3xl mb-3">&#127942;</div>
          <h3 className="font-semibold mb-2">Compete & Trade</h3>
          <p className="text-gray-400 text-sm">
            Scout talent, negotiate transfers, upgrade your stadium, and outsmart rivals.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-4 text-center text-gray-600 text-sm">
        Kickoff Manager &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
