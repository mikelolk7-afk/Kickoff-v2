"use client";

import { useQuery } from "@tanstack/react-query";

interface CupClub {
  id: string;
  name: string;
  badgeId: string;
}

interface CupFixture {
  id: string;
  homeClub: CupClub;
  awayClub: CupClub;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  status: string;
}

interface CupRound {
  id: string;
  roundNum: number;
  name: string;
  fixtures: CupFixture[];
}

interface CupData {
  id: string;
  seasonNum: number;
  isActive: boolean;
  rounds: CupRound[];
}

export default function CupPage() {
  const { data, isLoading } = useQuery<{ cup: CupData | null }>({
    queryKey: ["cup"],
    queryFn: () => fetch("/api/cup").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Cup</h1>
        <div className="text-gray-400">Loading cup data...</div>
      </div>
    );
  }

  const cup = data?.cup;

  if (!cup) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Cup</h1>
        <div className="bg-panel rounded-lg border border-gray-800 p-8 text-center">
          <p className="text-gray-400">No active cup competition.</p>
          <p className="text-gray-500 text-sm mt-2">
            The cup draw will be generated at the start of each season.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Cup — Season {cup.seasonNum}
        {cup.isActive && (
          <span className="ml-3 text-sm font-normal text-primary">Active</span>
        )}
      </h1>

      <div className="space-y-6">
        {cup.rounds.map((round) => (
          <div
            key={round.id}
            className="bg-panel rounded-lg border border-gray-800"
          >
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="font-semibold">{round.name}</h2>
            </div>

            <div className="divide-y divide-gray-800">
              {round.fixtures.map((fixture) => (
                <div
                  key={fixture.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex-1 text-right pr-4">
                    <span
                      className={
                        fixture.winnerId === fixture.homeClub.id
                          ? "font-bold text-primary"
                          : ""
                      }
                    >
                      {fixture.homeClub.name}
                    </span>
                  </div>

                  <div className="w-20 text-center font-mono text-lg">
                    {fixture.status === "COMPLETED" ? (
                      <span>
                        {fixture.homeScore} - {fixture.awayScore}
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm">vs</span>
                    )}
                  </div>

                  <div className="flex-1 pl-4">
                    <span
                      className={
                        fixture.winnerId === fixture.awayClub.id
                          ? "font-bold text-primary"
                          : ""
                      }
                    >
                      {fixture.awayClub.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
