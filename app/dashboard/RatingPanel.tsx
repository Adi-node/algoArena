import { getContestHistory } from "@/lib/leetcode";
import RatingChart from "./RatingChart";

export default async function RatingPanel({ username }: { username: string }) {
  const history = await getContestHistory(username).catch((e) => {
    console.error("[dashboard] getContestHistory failed:", e);
    return null;
  });

  const rating = history?.userContestRanking?.rating
    ? Math.round(history.userContestRanking.rating)
    : null;
  const attended = (history?.userContestRankingHistory ?? []).filter((c) => c.attended);
  const series = attended
    .map((c) => ({
      date: c.contest.startTime * 1000,
      rating: c.rating,
      title: c.contest.title,
    }))
    .sort((a, b) => a.date - b.date);

  return (
    <div className="aa-panel">
      <div className="aa-panel-head">
        <div>
          <div className="title">Contest rating</div>
          <div className="lead">
            {rating ?? "—"}
            {attended.length > 0 && <small>{attended.length} contests</small>}
          </div>
        </div>
      </div>
      {series.length > 0 ? (
        <RatingChart data={series} />
      ) : (
        <div style={{ height: 192, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--rc-mute)", fontSize: 13 }}>
          No contest history yet.
        </div>
      )}
    </div>
  );
}

export function RatingPanelSkeleton() {
  return (
    <div className="aa-panel">
      <div className="aa-panel-head">
        <div>
          <div className="title">Contest rating</div>
          <div className="lead aa-skel-text" style={{ width: 120, height: 28 }} />
        </div>
      </div>
      <div className="aa-skel-block" style={{ height: 220 }} />
    </div>
  );
}
