import { weekdayName, type LearningStats } from "@/lib/learning/stats";
import { XP_RULES, xpLevel } from "@/lib/learning/xp";
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

/** Level, XP and progress to the next level, with how XP is earned. */
function Level({ xp }: { xp: { total: number; week: number } }) {
  const l = xpLevel(xp.total);
  const pct = Math.round((l.into / l.span) * 100);
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4 lg:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-2xl font-semibold tracking-tight">
          Level {l.level}
          <span className="ml-3 text-base font-normal text-muted-foreground tabular-nums">
            {l.total.toLocaleString("en-IN")} XP
          </span>
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {xp.week > 0 ? `+${xp.week} XP in the last 7 days` : "No XP in the last 7 days"}
        </p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`Progress to level ${l.level + 1}`}
        aria-valuemin={0}
        aria-valuemax={l.span}
        aria-valuenow={l.into}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <p className="tabular-nums">
          {l.toNext} XP to level {l.level + 1}
        </p>
        <details className="group">
          <summary className="cursor-pointer select-none hover:text-foreground">How to earn XP</summary>
          <ul className="mt-2 grid gap-1">
            {XP_RULES.map((r) => (
              <li key={r.label} className="flex justify-between gap-6">
                <span>{r.label}</span>
                <span className="font-medium text-foreground tabular-nums">+{r.points}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

/** Level, streak, totals and the last week, shown at the top of "My courses". */
export function ProgressSummary({ stats, xp }: { stats: LearningStats; xp: { total: number; week: number } }) {
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
      <Level xp={xp} />
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
