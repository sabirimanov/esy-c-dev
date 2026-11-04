/**
 * Percentage shares captured from the Screen 13 snapshot (totalCalls = 59,875).
 * Live totals come from CCC CallCenter/total_calls; category counts = total × share × (0.95–1.05).
 */
export const BRAIN_SHARE_BASE_TOTAL = 59875

export const brainCallCenterShares = {
  answeredOfTotal: 59875 / BRAIN_SHARE_BASE_TOTAL,
  ahtSeconds: 161,
  aht: "02:41",
  serviceSatisfaction: 76.03,
  reasons: [
    { label: "Gas supply interruption", share: 4014 / BRAIN_SHARE_BASE_TOTAL, paint: "teal" as const },
    { label: "Subscriber data update", share: 3079 / BRAIN_SHARE_BASE_TOTAL, paint: "teal" as const },
    { label: "Address clarification", share: 1479 / BRAIN_SHARE_BASE_TOTAL, paint: "orange" as const },
    { label: "Gas supply issue", share: 1285 / BRAIN_SHARE_BASE_TOTAL, paint: "orange" as const },
    { label: "Request registration", share: 921 / BRAIN_SHARE_BASE_TOTAL, paint: "orange" as const },
    { label: "Meter number verification", share: 899 / BRAIN_SHARE_BASE_TOTAL, paint: "orange" as const },
    { label: "Meter replacement", share: 621 / BRAIN_SHARE_BASE_TOTAL, paint: "orange" as const },
    { label: "Meter number confirmation", share: 615 / BRAIN_SHARE_BASE_TOTAL, paint: "orange" as const },
  ],
  issues: [
    { label: "Supply interruption", share: 4014 / BRAIN_SHARE_BASE_TOTAL, color: "#34efde" },
    { label: "Subscriber data", share: 3079 / BRAIN_SHARE_BASE_TOTAL, color: "#4aa3d8" },
    { label: "Address", share: 1479 / BRAIN_SHARE_BASE_TOTAL, color: "#2f5f9a" },
    { label: "Supply issue", share: 1285 / BRAIN_SHARE_BASE_TOTAL, color: "#e07058" },
    { label: "Registration", share: 921 / BRAIN_SHARE_BASE_TOTAL, color: "#e8a078" },
  ],
  quality: [
    { label: "Greeting & professionalism", value: 54.09, paint: "orange" as const },
    { label: "Customer verification", value: 76.03, paint: "teal" as const },
    { label: "Issue understanding & resolution", value: 74.59, paint: "blue" as const },
    { label: "Communication quality", value: 69.53, paint: "orange" as const },
    { label: "Process compliance", value: 74.73, paint: "teal" as const },
    { label: "Call closure", value: 67.05, paint: "orange" as const },
  ],
  operators: [
    { name: "Samirə Əliyeva", share: 6577 / BRAIN_SHARE_BASE_TOTAL, ahtSeconds: 163, aht: "02:43", score: 86 },
    { name: "Kamandar Məmmədov", share: 6793 / BRAIN_SHARE_BASE_TOTAL, ahtSeconds: 161, aht: "02:41", score: 87 },
    { name: "Fərid Rzayev", share: 6718 / BRAIN_SHARE_BASE_TOTAL, ahtSeconds: 161, aht: "02:41", score: 87 },
    { name: "Murad Abdullayev", share: 6625 / BRAIN_SHARE_BASE_TOTAL, ahtSeconds: 161, aht: "02:41", score: 87 },
  ],
} as const
