let origin = "http://127.0.0.1:4317"

export function setDuckdbOrigin(value) {
  origin = value
}

export function duckdbUrl(path) {
  return new URL(path, origin)
}

export function isDuckdbRequest(url) {
  const path = (url || "/").split("?")[0]
  return path === "/explorer" || path.startsWith("/explorer/") || path === "/api" || path.startsWith("/api/")
}
