import { bakuNow, bakuParts, bakuToday, endOfBakuDay, useDash, type DashQuery, type DashTab } from "./dashboard"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const COLS = [3980, 4084, 4187, 4292, 4389, 4483, 4591]
const ROWS = [151, 204, 257, 310, 363, 416]
const ACTIVE = "linear-gradient(90deg, #34efde 0%, #1e897f 100%)"
export const SHOW_DATE_SELECTION = false
const QUICK_TOP = 339 - 95

const TABS: { id: DashTab; label: string; x: number; w: number }[] = [
  { id: "day", label: "Day", x: 4959, w: 130 },
  { id: "month", label: "Month", x: 5116, w: 140 },
  { id: "year", label: "Year", x: 5278, w: 140 },
  { id: "range", label: "Date Range", x: 5452.5, w: 147 },
]

const QUICK = [
  { id: "now" as const, label: "Now", x: 4939.5 },
  { id: "yesterday" as const, label: "Yesterday", x: 5122.5 },
  { id: "custom" as const, label: "Custom Date", x: 5304.5 },
]

function weeksOf(y: number, m: number) {
  const pad = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(pad).fill(null)
  for (let day = 1; day <= count; day += 1) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

function rangeFor(tab: DashTab, current: DashQuery["range"]) {
  if (tab === "day") return "24h" as const
  if (tab === "range") return "7d" as const
  return current
}

function future(y: number, m: number, day: number) {
  const today = bakuToday()
  if (y !== today.y) return y > today.y
  if (m !== today.m) return m > today.m
  return day > today.d
}

export function SnocCalendar() {
  const { query, setQuery } = useDash()
  const today = bakuToday()
  const selected = bakuParts(query.end ?? bakuNow())
  const weeks = weeksOf(query.viewY, query.viewM)

  function commit(next: DashQuery) {
    setQuery(next)
  }

  function shift(delta: number) {
    const step = query.tab === "year" ? delta * 12 : delta
    const next = new Date(Date.UTC(query.viewY, query.viewM + step, 1))
    const y = next.getUTCFullYear()
    const m = next.getUTCMonth()
    if (y > today.y || (y === today.y && m > today.m)) return
    commit({ ...query, viewY: y, viewM: m })
  }

  function pickDay(day: number) {
    if (future(query.viewY, query.viewM, day)) return
    const end = Math.min(endOfBakuDay(query.viewY, query.viewM, day), bakuNow())
    commit({ ...query, end, quick: "custom", range: rangeFor(query.tab, query.range) })
  }

  return (
    <>
      <button type="button" className="snoc-hit" style={{ left: 3996, top: 52, width: 48, height: 52 }} aria-label="Previous month" onClick={() => shift(-1)} />
      <div className="snoc-node snoc-copy" style={{ left: 4048, top: 61, width: 520, height: 38, fontSize: 32, fontWeight: 700, color: "#f2f6f5", lineHeight: "38px", textAlign: "center", zIndex: 4 }}>
        {MONTHS[query.viewM]} {query.viewY}
      </div>
      <button type="button" className="snoc-hit" style={{ left: 4568, top: 52, width: 48, height: 52 }} aria-label="Next month" onClick={() => shift(1)} />

      {weeks.map((week, row) => week.map((day, column) => {
        if (day == null || row >= ROWS.length) return null
        const on = selected.y === query.viewY && selected.m === query.viewM && selected.d === day
        const blocked = future(query.viewY, query.viewM, day)
        return (
          <button
            key={`${query.viewY}-${query.viewM}-${day}`}
            type="button"
            className="snoc-hit"
            disabled={blocked}
            onClick={() => pickDay(day)}
            style={{
              left: COLS[column],
              top: ROWS[row],
              width: 54,
              height: 54,
              borderRadius: 27,
              background: on ? "#34efde" : "transparent",
              color: blocked ? "#4d5c5a" : on ? "#071817" : "#f2f6f5",
              fontSize: 24,
              lineHeight: "54px",
              fontWeight: on ? 700 : 400,
              cursor: blocked ? "default" : "pointer",
            }}
          >
            {day}
          </button>
        )
      }))}

      {SHOW_DATE_SELECTION && TABS.map((tab) => {
        const on = query.tab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            className="snoc-hit"
            onClick={() => commit({ ...query, tab: tab.id, range: rangeFor(tab.id, query.range) })}
            style={{
              left: tab.x,
              top: 140,
              width: tab.w,
              height: 56,
              borderRadius: 28,
              background: on ? ACTIVE : "transparent",
              color: on ? "#071615" : "#9da9aa",
              fontSize: 20,
              lineHeight: "56px",
              fontWeight: 400,
            }}
          >
            {tab.label}
          </button>
        )
      })}

      {QUICK.map((item) => {
        const on = query.quick === item.id
        return (
          <button
            key={item.id}
            type="button"
            className="snoc-hit"
            onClick={() => {
              if (item.id === "now") {
                commit({ ...query, end: null, quick: "now", viewY: today.y, viewM: today.m, range: rangeFor(query.tab, query.range) })
                return
              }
              if (item.id === "yesterday") {
                const prior = new Date(Date.UTC(today.y, today.m, today.d - 1))
                const y = prior.getUTCFullYear()
                const m = prior.getUTCMonth()
                const d = prior.getUTCDate()
                commit({ ...query, end: endOfBakuDay(y, m, d), quick: "yesterday", viewY: y, viewM: m, range: rangeFor(query.tab, query.range) })
                return
              }
              commit({ ...query, quick: "custom", tab: "day", range: "24h" })
            }}
            style={{
              left: item.x,
              top: QUICK_TOP,
              width: 160,
              height: 50,
              borderRadius: 25,
              background: on ? ACTIVE : "#0c1b1c",
              color: on ? "#071615" : "#d7e2e0",
              fontSize: 20,
              lineHeight: "50px",
              fontWeight: 400,
            }}
          >
            {item.label}
          </button>
        )
      })}
    </>
  )
}
