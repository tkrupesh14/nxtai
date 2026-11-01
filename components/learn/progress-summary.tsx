import { weekdayName, type LearningStats } from "@/lib/learning/stats";
import { cn } from "@/lib/utils";

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {note ? (
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      ) : null}
    </div>
  );
}

function studyTime(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h)} h`;
}

/** Last 7 days: one bar per day for lessons completed; a dot marks days with only professor questions. */
function Week({ week }: { week: LearningStats["week"] }) {
  const max = Math.max(1, ...week.map((d) => d.lessons));
  const total = week.reduce((s, d) => s + d.lessons, 0);
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">Last 7 days</p>
      <p className="mt-1 text-sm">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {total}
        </span>{" "}
        <span className="text-muted-foreground">
          lesson{total === 1 ? "" : "s"} completed
        </span>
      </p>
      <ol
        className="mt-3 grid h-20 grid-cols-7 items-end gap-1.5"
        aria-label="Lessons completed per day, last 7 days"
      >
        {week.map((d, i) => {
          const name = weekdayName(d.day);
          const today = i === week.length - 1;
          const label = `${today ? "Today" : name}: ${d.lessons} lesson${d.lessons === 1 ? "" : "s"}${
            d.active && !d.lessons ? " (asked the professor)" : ""
          }`;
          return (
            <li
              key={d.day}
              className="group relative flex h-full flex-col items-center justify-end gap-1"
              title={label}
              aria-label={label}
            >
              <span
                className={cn(
                  "pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-0.5 text-[11px] text-popover-foreground shadow-sm group-hover:block",
                  i < 2
                    ? "left-0"
                    : i > 4
                      ? "right-0"
                      : "left-1/2 -translate-x-1/2",
                )}
              >
                {label}
              </span>
              <div className="flex w-full flex-1 items-end justify-center">
                {d.lessons > 0 ? (
                  <div
                    className="w-full max-w-5 rounded-t bg-primary"
                    style={{
                      height: `${Math.max(14, (d.lessons / max) * 100)}%`,
                    }}
                  />
                ) : d.active ? (
                  <div className="mb-0.5 size-1.5 rounded-full bg-primary/60" />
                ) : (
                  <div className="h-px w-full max-w-5 bg-border" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] leading-none text-muted-foreground",
                  today && "font-semibold text-foreground",
                )}
              >
                {today ? "Today" : name.slice(0, 2)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Streak, totals and the last week, shown at the top of "My courses". */
export function ProgressSummary({ stats }: { stats: LearningStats }) {
  const streakNote =
    stats.streak === 0
      ? "Finish a lesson today to start one"
      : stats.activeToday
        ? stats.bestStreak > stats.streak
          ? `Best: ${stats.bestStreak} days`
          : "Your best yet"
        : "Study today to keep it going";
  return (
    <section
      aria-label="Your progress"
      className="mb-8 grid gap-3 lg:grid-cols-2"
    >
      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Streak"
          value={
            <>
              <span aria-hidden>🔥</span> {stats.streak} day
              {stats.streak === 1 ? "" : "s"}
            </>
          }
          note={streakNote}
        />
        <Tile label="Lessons completed" value={stats.lessonsDone} />
        <Tile
          label="Study time"
          value={studyTime(stats.minutes)}
          note="Based on lesson lengths"
        />
        <Tile
          label="Average quiz score"
          value={stats.avgScore === null ? "—" : `${stats.avgScore}%`}
          note="Best try per lesson"
        />
      </div>
      <Week week={stats.week} />
    </section>
  );
}
