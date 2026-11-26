/** Single status.id → wall color. Do not use sub_category for color. */

export type StatusBucket =
  | "queue.new"
  | "queue.assigned"
  | "progress"
  | "done"
  | "closed.null"
  | "unresolved"
  | "unknown"

/** Status colors — same fill for dots and cluster ring arcs. */
const HEX: Record<StatusBucket, string> = {
  "queue.new": "#38BDF8",
  "queue.assigned": "#818CF8",
  progress: "#EAB308",
  done: "#22C55E",
  "closed.null": "#94A3B8",
  unresolved: "#EF4444",
  unknown: "#E879F9",
}

const BY_ID: Record<string, StatusBucket> = {
  "1": "queue.new", // Yeni
  "3": "queue.assigned", // Təyin edilib
  "4": "progress", // Qəbul edilib
  "5": "progress", // Yola çıxıb
  "6": "progress", // İşə başlayıb
  "11": "progress", // Təmir tələbi
  "12": "done", // Təmirə göndərildi / yönləndirildi → Tamamlanmışdır (green)
  "7": "done", // Tamamlanıb / Tamamlanmışdır
  "10": "done", // Aşkar olunmadı → Tamamlanmışdır (green)
  "9": "unresolved", // Passiv
}

/** Screen18 legend + map labels — English only (by status.id). */
const LABEL_EN: Record<string, string> = {
  "1": "New",
  "3": "Assigned",
  "4": "Accepted",
  "5": "En route",
  "6": "Work started",
  "7": "Completed",
  "9": "Passive",
  "10": "Completed", // Aşkar olunmadı → Tamamlanmışdır
  "11": "Repair request",
  "12": "Completed", // Təmirə yönləndirildi → Tamamlanmışdır
}

/** Fallback when id is unknown — normalize AZ / mixed API titles. */
const TITLE_EN: Record<string, string> = {
  yeni: "New",
  "təyin edilib": "Assigned",
  "teyin edilib": "Assigned",
  "qəbul edilib": "Accepted",
  "qabul edilib": "Accepted",
  "yola çıxıb": "En route",
  "yola cixib": "En route",
  "işə başlayıb": "Work started",
  "ise baslayib": "Work started",
  tamamlanıb: "Completed",
  tamamlanib: "Completed",
  tamamlanmışdır: "Completed",
  tamamlanmisdir: "Completed",
  passiv: "Passive",
  "aşkar olunmadı": "Completed",
  "askar olunmadi": "Completed",
  "təmir tələbi": "Repair request",
  "temir telebi": "Repair request",
  "təmirə göndərildi": "Completed",
  "temire gonderildi": "Completed",
  "təmirə yönləndirildi": "Completed",
  "temire yonlendirildi": "Completed",
}

function foldTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
}

const BUCKET_ORDER: StatusBucket[] = [
  "queue.new",
  "queue.assigned",
  "progress",
  "unresolved",
  "closed.null",
  "done",
  "unknown",
]

export function statusBucket(id: unknown): StatusBucket {
  if (id == null || id === "") return "unknown"
  return BY_ID[String(id)] ?? "unknown"
}

export function statusColor(id: unknown): string {
  return HEX[statusBucket(id)]
}

export function statusLabel(title: unknown): string {
  if (typeof title === "string" && title.trim()) return title.trim()
  return "Unknown status"
}

export function statusLabelEn(id: unknown, fallbackTitle?: unknown): string {
  const key = id == null ? "" : String(id)
  if (key && LABEL_EN[key]) return LABEL_EN[key]
  if (typeof fallbackTitle === "string" && fallbackTitle.trim()) {
    const raw = fallbackTitle.trim()
    const folded = foldTitle(raw)
    if (TITLE_EN[raw.toLowerCase()]) return TITLE_EN[raw.toLowerCase()]
    if (TITLE_EN[folded]) return TITLE_EN[folded]
    // Never show AZ on the wall — last resort English placeholder.
    return "Unknown"
  }
  return "Unknown"
}

export function bucketOrderIndex(bucket: StatusBucket): number {
  return BUCKET_ORDER.indexOf(bucket)
}

export const STATUS_HEX = HEX
