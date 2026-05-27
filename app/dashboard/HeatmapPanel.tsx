import { getUserCalendar } from "@/lib/leetcode";
import HeatmapCalendar from "./HeatmapCalendar";

export default async function HeatmapPanel({
  username,
  ownerUserId,
  year,
}: {
  username: string;
  ownerUserId: string;
  year: number;
}) {
  const calRes = await getUserCalendar(username, ownerUserId, year).catch((e) => {
    console.error("[dashboard] getUserCalendar failed:", e);
    return null;
  });

  let totalActiveDays = 0;
  let calendar: Record<string, number> = {};
  if (calRes?.matchedUser?.userCalendar) {
    totalActiveDays = calRes.matchedUser.userCalendar.totalActiveDays;
    try {
      calendar = JSON.parse(calRes.matchedUser.userCalendar.submissionCalendar) as Record<string, number>;
    } catch {
      calendar = {};
    }
  }

  return (
    <div className="aa-panel">
      <div className="aa-panel-head">
        <div>
          <div className="title">Activity · {year}</div>
          <div className="lead">
            {totalActiveDays}
            <small>days coded</small>
          </div>
        </div>
      </div>
      <HeatmapCalendar calendar={calendar} year={year} />
    </div>
  );
}

export function HeatmapPanelSkeleton({ year }: { year: number }) {
  return (
    <div className="aa-panel">
      <div className="aa-panel-head">
        <div>
          <div className="title">Activity · {year}</div>
          <div className="lead aa-skel-text" style={{ width: 80, height: 28 }} />
        </div>
      </div>
      <div className="aa-skel-block" style={{ height: 220 }} />
    </div>
  );
}
