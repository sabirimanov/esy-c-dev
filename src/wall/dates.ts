const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function iso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function parseIso(value: string) {
  const [y, m, d] = value.split("-").map(Number)
  return { y, m, d }
}

export function todayIso() {
  const now = new Date()
  return iso(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function addDays(value: string, days: number) {
  const { y, m, d } = parseIso(value)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const lead = (first.getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: (number | null)[] = Array(lead).fill(null)
  for (let day = 1; day <= count; day++) cells.push(day)
  while (cells.length % 7) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function shiftView(view: { y: number; m: number }, delta: number) {
  const next = new Date(Date.UTC(view.y, view.m - 1 + delta, 1))
  return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1 }
}

export function monthTitle(view: { y: number; m: number }) {
  return new Date(Date.UTC(view.y, view.m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function periodRange(period: string, today = todayIso()) {
  const { y, m } = parseIso(today)
  if (period === "Today") return { date: today, dateTo: today }
  if (period === "Last 7 Days") return { date: addDays(today, -6), dateTo: today }
  if (period === "Last 30 Days") return { date: addDays(today, -29), dateTo: today }
  if (period === "This Month") return { date: iso(y, m, 1), dateTo: today }
  if (period === "This Year") return { date: iso(y, 1, 1), dateTo: today }
  if (period === "Last Month") {
    const prev = shiftView({ y, m }, -1)
    const last = new Date(Date.UTC(prev.y, prev.m, 0)).getUTCDate()
    return { date: iso(prev.y, prev.m, 1), dateTo: iso(prev.y, prev.m, last) }
  }
  return null
}

function inclusiveDays(date: string, dateTo: string) {
  const start = Date.parse(`${date}T00:00:00Z`)
  const end = Date.parse(`${dateTo}T00:00:00Z`)
  return Math.round((end - start) / 86400000) + 1
}

function monthLength(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function isMonthSelection(date: string, dateTo: string, period: string) {
  if (period === "This Month" || period === "Last Month") return true
  const start = parseIso(date)
  const end = parseIso(dateTo)
  return start.y === end.y && start.m === end.m && start.d === 1 && end.d === monthLength(start.y, start.m)
}

export function previousSpan(date: string, dateTo: string, period: string) {
  if (isMonthSelection(date, dateTo, period)) {
    const start = parseIso(date)
    const end = parseIso(dateTo)
    const prev = shiftView({ y: start.y, m: start.m }, -1)
    const last = monthLength(prev.y, prev.m)
    const full = end.d === monthLength(start.y, start.m)
    return { date: iso(prev.y, prev.m, 1), dateTo: iso(prev.y, prev.m, full ? last : Math.min(end.d, last)) }
  }
  const days = inclusiveDays(date, dateTo)
  return { date: addDays(date, -days), dateTo: addDays(date, -1) }
}

const longMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

export function trendCaption(date: string, dateTo: string, period: string) {
  const start = parseIso(date)
  const end = parseIso(dateTo)
  if (isMonthSelection(date, dateTo, period)) {
    if (start.y === end.y && start.m === end.m) return `${longMonths[start.m - 1]} ${start.y}`
    if (start.y === end.y) return `${longMonths[start.m - 1]} – ${longMonths[end.m - 1]} ${start.y}`
    return `${longMonths[start.m - 1]} ${start.y} – ${longMonths[end.m - 1]} ${end.y}`
  }
  return formatRange(date, dateTo)
}

export function formatRange(date: string, dateTo: string) {
  const a = parseIso(date)
  const b = parseIso(dateTo)
  const left = `${a.d} ${months[a.m - 1]}`
  const right = `${b.d} ${months[b.m - 1]}`
  if (date === dateTo) return `${left} ${a.y}`
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${months[a.m - 1]} ${a.y}`
  if (a.y === b.y) return `${left} – ${right} ${a.y}`
  return `${left} ${a.y} – ${right} ${b.y}`
}
