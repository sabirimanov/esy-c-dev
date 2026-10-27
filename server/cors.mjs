export function applyCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cache-Control, Pragma")
  if (req.method === "OPTIONS") {
    res.writeHead(204).end()
    return true
  }
  return false
}
