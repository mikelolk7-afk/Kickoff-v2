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

export default function ContinentalPage() {
  const { data, isLoading } = useQuery<{
    cup: { id: string; isActive: boolean } | null;
    groupStage: CupRound[];
    knockout: CupRound[];
  }>({
    queryKey: ["continental"],
    queryFn: () => fetch("/api/continental").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Continental Cup</h1>
        <div className="text-muted">Loading...</div>
      </div>
    );
  }

  if (!data?.cup) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Continental Cup</h1>
        <div className="bg-panel rounded-lg border border-border p-8 text-center">
          <p className="text-muted">No active Continental Cup.</p>
          <p className="text-subtle text-sm mt-2">
            Top 3 clubs from each division qualify at the end of each season.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Continental Cup
        {data.cup.isActive && (
          <span className="ml-3 text-sm font-normal text-primary">Active</span>
        )}
      </h1>

      {/* Group Stage */}
      {data.groupStage && data.groupStage.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Group Stage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.groupStage.map((group) => (
              <div
                key={group.id}
                className="bg-panel rounded-lg border border-border"
              >
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="font-semibold">{group.name}</h3>
                </div>
                <div className="divide-y divide-border">
                  {group.fixtures.map((f) => (
                    <div
                      key={f.id}
                      className="px-4 py-2 flex items-center justify-between text-sm"
                    >
                      <span className="flex-1 text-right pr-3 truncate">
                        {f.homeClub.name}
                      </span>
                      <span className="w-16 text-center font-mono">
                        {f.status === "COMPLETED"
                          ? `${f.homeScore} - ${f.awayScore}`
                          : "vs"}
                      </span>
                      <span className="flex-1 pl-3 truncate">
                        {f.awayClub.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knockout Stage */}
      {data.knockout && data.knockout.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Knockout Stage</h2>
          <div className="space-y-4">
            {data.knockout.map((round) => (
              <div
                key={round.id}
                className="bg-panel rounded-lg border border-border"
              >
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="font-semibold">{round.name}</h3>
                </div>
                <div className="divide-y divide-border">
                  {round.fixtures.map((f) => (
                    <div
                      key={f.id}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <span
                        className={`flex-1 text-right pr-4 ${
                          f.winnerId === f.homeClub.id
                            ? "font-bold text-primary"
                            : ""
                        }`}
                      >
                        {f.homeClub.name}
                      </span>
                      <span className="w-20 text-center font-mono text-lg">
                        {f.status === "COMPLETED"
                          ? `${f.homeScore} - ${f.awayScore}`
                          : "vs"}
                      </span>
                      <span
                        className={`flex-1 pl-4 ${
                          f.winnerId === f.awayClub.id
                            ? "font-bold text-primary"
                            : ""
                        }`}
                      >
                        {f.awayClub.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
