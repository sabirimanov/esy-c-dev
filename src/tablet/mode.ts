/** Tablet / WebView remote-control flags from the URL query string. */

export type TabletMode = {
  tablet: boolean
  noborder: boolean
}

export function readTabletMode(search = window.location.search): TabletMode {
  const q = new URLSearchParams(search)
  const tablet = q.get("tablet") === "1"
  const noborder = tablet || q.get("noborder") === "1"
  return { tablet, noborder }
}

export function isOverviewPath(pathname = window.location.pathname): boolean {
  return pathname === "/overview" || pathname === "/socnoc/overview"
}

/** Apply html classes so CSS can hide frames without touching every screen. */
export function applyTabletDomClass(search = window.location.search) {
  const { tablet, noborder } = readTabletMode(search)
  document.documentElement.classList.toggle("is-tablet", tablet)
  document.documentElement.classList.toggle("is-noborder", noborder)
  document.documentElement.classList.toggle("is-overview", isOverviewPath())
  return { tablet, noborder }
}

/** Keep tablet query params when the app navigates between screens. */
export function withTabletQuery(path: string, search = window.location.search): string {
  const { tablet, noborder } = readTabletMode(search)
  if (!tablet && !noborder) return path
  const q = new URLSearchParams()
  if (tablet) q.set("tablet", "1")
  if (noborder) q.set("noborder", "1")
  const qs = q.toString()
  return qs ? `${path}?${qs}` : path
}
