import { db } from "@/lib/db";

/**
 * SSE endpoint for live match streaming.
 *
 * When a match is LIVE, this streams events minute-by-minute in real time.
 * When COMPLETED, it sends all events at once and closes.
 * When SCHEDULED, it waits for the match to go live (polling internal state).
 *
 * Client connects via:
 *   const es = new EventSource('/api/match/<id>/live');
 *   es.onmessage = (e) => { const data = JSON.parse(e.data); ... };
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const fixtureId = params.id;

  const fixture = await db.fixture.findUnique({
    where: { id: fixtureId },
    include: {
      homeClub: { select: { id: true, name: true, kitHome: true } },
      awayClub: { select: { id: true, name: true, kitHome: true } },
      events: { orderBy: { minute: "asc" } },
    },
  });

  if (!fixture) {
    return new Response("Match not found", { status: 404 });
  }

  // For completed matches, return all events at once as SSE
  if (fixture.status === "COMPLETED") {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        // Send match metadata
        controller.enqueue(
          encoder.encode(
            `event: meta\ndata: ${JSON.stringify({
              status: fixture.status,
              homeClub: fixture.homeClub,
              awayClub: fixture.awayClub,
              homeScore: fixture.homeScore,
              awayScore: fixture.awayScore,
              homePoss: fixture.homePoss,
              awayPoss: fixture.awayPoss,
              homeShots: fixture.homeShots,
              awayShots: fixture.awayShots,
              homeShotsOnTarget: fixture.homeShotsOnTarget,
              awayShotsOnTarget: fixture.awayShotsOnTarget,
              homeFouls: fixture.homeFouls,
              awayFouls: fixture.awayFouls,
              homeCorners: fixture.homeCorners,
              awayCorners: fixture.awayCorners,
              homeYellows: fixture.homeYellows,
              awayYellows: fixture.awayYellows,
              homeReds: fixture.homeReds,
              awayReds: fixture.awayReds,
              extraTime: fixture.extraTime,
              penalties: fixture.penalties,
              homePenScore: fixture.homePenScore,
              awayPenScore: fixture.awayPenScore,
              playerRatings: fixture.playerRatings,
              heatMapData: fixture.heatMapData,
            })}\n\n`
          )
        );

        // Send all events at once
        for (const event of fixture.events) {
          controller.enqueue(
            encoder.encode(
              `event: match-event\ndata: ${JSON.stringify({
                minute: event.minute,
                type: event.type,
                team: event.team,
                playerId: event.playerId,
                assistId: event.assistId,
                assistName: event.assistName,
                detail: event.detail,
                xPos: event.xPos,
                yPos: event.yPos,
              })}\n\n`
            )
          );
        }

        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // For LIVE matches, stream events with a delay to simulate real-time
  if (fixture.status === "LIVE") {
    const encoder = new TextEncoder();
    let cancelled = false;

    const body = new ReadableStream({
      async start(controller) {
        // Send metadata
        controller.enqueue(
          encoder.encode(
            `event: meta\ndata: ${JSON.stringify({
              status: "LIVE",
              homeClub: fixture.homeClub,
              awayClub: fixture.awayClub,
            })}\n\n`
          )
        );

        // Stream events with delays proportional to minute gaps
        let lastMinute = 0;
        for (const event of fixture.events) {
          if (cancelled) break;

          // Delay between events: ~2 seconds per game minute
          const minuteGap = event.minute - lastMinute;
          if (minuteGap > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, minuteGap * 2000)
            );
          }
          lastMinute = event.minute;

          if (cancelled) break;

          controller.enqueue(
            encoder.encode(
              `event: match-event\ndata: ${JSON.stringify({
                minute: event.minute,
                type: event.type,
                team: event.team,
                playerId: event.playerId,
                assistId: event.assistId,
                assistName: event.assistName,
                detail: event.detail,
                xPos: event.xPos,
                yPos: event.yPos,
              })}\n\n`
            )
          );
        }

        if (!cancelled) {
          // Re-fetch final stats
          const final = await db.fixture.findUnique({
            where: { id: fixtureId },
            select: {
              homeScore: true,
              awayScore: true,
              homePoss: true,
              awayPoss: true,
              homeShots: true,
              awayShots: true,
              homeShotsOnTarget: true,
              awayShotsOnTarget: true,
              homeFouls: true,
              awayFouls: true,
              homeCorners: true,
              awayCorners: true,
              homeYellows: true,
              awayYellows: true,
              homeReds: true,
              awayReds: true,
              extraTime: true,
              penalties: true,
              homePenScore: true,
              awayPenScore: true,
              playerRatings: true,
              heatMapData: true,
            },
          });

          controller.enqueue(
            encoder.encode(
              `event: final-stats\ndata: ${JSON.stringify(final)}\n\n`
            )
          );
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
          controller.close();
        }
      },
      cancel() {
        cancelled = true;
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // SCHEDULED: return status info, client should poll or reconnect
  return new Response(
    JSON.stringify({
      status: fixture.status,
      scheduledAt: fixture.scheduledAt,
      homeClub: fixture.homeClub,
      awayClub: fixture.awayClub,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
