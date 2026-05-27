"use client";

interface Props {
  calendar: Record<string, number>;
  year: number;
}

const DAY_MS = 86_400_000;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function bucketClass(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "l1";
  if (count <= 3) return "l2";
  if (count <= 6) return "l3";
  return "l4";
}

export default function HeatmapCalendar({ calendar, year }: Props) {
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const endOfYear = new Date(Date.UTC(year, 11, 31));
  const today = new Date();
  const endTs = Math.min(endOfYear.getTime(), Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const startDow = startOfYear.getUTCDay();
  const gridStart = startOfYear.getTime() - startDow * DAY_MS;

  const weeks: { date: Date; count: number; inYear: boolean }[][] = [];
  for (let weekStart = gridStart; weekStart <= endTs; weekStart += 7 * DAY_MS) {
    const week: { date: Date; count: number; inYear: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const ts = weekStart + d * DAY_MS;
      const date = new Date(ts);
      const inYear = ts >= startOfYear.getTime() && ts <= endTs;
      const unixSec = Math.floor(ts / 1000);
      const count = inYear ? calendar[String(unixSec)] ?? 0 : 0;
      week.push({ date, count, inYear });
    }
    weeks.push(week);
  }

  const monthMarkers: { weekIdx: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, idx) => {
    const firstInYear = week.find((d) => d.inYear);
    if (!firstInYear) return;
    const m = firstInYear.date.getUTCMonth();
    if (m !== lastMonth) {
      monthMarkers.push({ weekIdx: idx, label: MONTH_LABELS[m] });
      lastMonth = m;
    }
  });

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div style={{ display: "inline-block", minWidth: "100%" }}>
        <div style={{ position: "relative", height: 16, marginBottom: 4, paddingLeft: 28 }}>
          {monthMarkers.map((m) => (
            <span
              key={`${m.weekIdx}-${m.label}`}
              style={{ position: "absolute", left: 28 + m.weekIdx * 15, fontSize: 10, color: "var(--rc-mute)", letterSpacing: "0.4px" }}
            >
              {m.label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 10, color: "var(--rc-mute)", paddingTop: 1 }}>
            <span style={{ height: 12, lineHeight: "12px" }} />
            <span style={{ height: 12, lineHeight: "12px" }}>Mon</span>
            <span style={{ height: 12, lineHeight: "12px" }} />
            <span style={{ height: 12, lineHeight: "12px" }}>Wed</span>
            <span style={{ height: 12, lineHeight: "12px" }} />
            <span style={{ height: 12, lineHeight: "12px" }}>Fri</span>
            <span style={{ height: 12, lineHeight: "12px" }} />
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {week.map((day, di) => {
                  if (!day.inYear) {
                    return <div key={di} style={{ width: 12, height: 12 }} />;
                  }
                  const cls = bucketClass(day.count);
                  return (
                    <div
                      key={di}
                      title={`${day.date.toISOString().slice(0, 10)}: ${day.count} submission${day.count === 1 ? "" : "s"}`}
                      className={`aa-heat-cell ${cls}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="aa-heat-legend">
          Less
          <div className="aa-heat-cell" />
          <div className="aa-heat-cell l1" />
          <div className="aa-heat-cell l2" />
          <div className="aa-heat-cell l3" />
          <div className="aa-heat-cell l4" />
          More
        </div>
      </div>
    </div>
  );
}
