import dividerTop from "../assets/socnoc/screen1/divider-top.svg"
import dividerIncidents from "../assets/socnoc/screen1/divider-incidents.svg"
import statusOrange from "../assets/socnoc/screen1/status-orange.svg"
import statusOrangeAlt from "../assets/socnoc/screen1/status-orange-alt.svg"
import statusRedAlt from "../assets/socnoc/screen1/status-red-alt.svg"
import calendarDayActive from "../assets/socnoc/screen1/calendar-day-active.svg"
import { Frame, ImgAt, Panel, Pin, TEAL, TEAL_GRAD } from "./ui"

const KPI_GRAD = "linear-gradient(to bottom, rgba(0,0,0,0) 71.104%, #34efde 122.31%)"
const KPI_GRAD_ALT = "linear-gradient(to bottom, rgba(48,58,68,0) 71.104%, #34efde 129.54%)"

const WEEKDAYS: { label: string; x: number; w: number }[] = [
  { label: "Mon", x: 64, w: 44 },
  { label: "Tue", x: 172, w: 36 },
  { label: "Wed", x: 272, w: 44 },
  { label: "Thu", x: 380, w: 38 },
  { label: "Fri", x: 483, w: 25 },
  { label: "Sat", x: 573.5, w: 33 },
  { label: "Sun", x: 678.5, w: 38 },
]

/** Exact Figma day centers for October 2026 (Mon-first). */
const DAYS: { d: number; x: number; y: number; w: number }[] = [
  { d: 1, x: 391, y: 377, w: 14 }, { d: 2, x: 488, y: 377, w: 14 }, { d: 3, x: 582.5, y: 377, w: 14 }, { d: 4, x: 690, y: 377, w: 14 },
  { d: 5, x: 78.5, y: 430, w: 14 }, { d: 6, x: 183, y: 430, w: 14 }, { d: 7, x: 286.5, y: 430, w: 14 }, { d: 8, x: 391, y: 430, w: 14 },
  { d: 9, x: 488, y: 430, w: 14 }, { d: 10, x: 576.5, y: 430, w: 27 }, { d: 11, x: 684, y: 430, w: 27 },
  { d: 12, x: 73, y: 483, w: 27 }, { d: 13, x: 177, y: 483, w: 27 }, { d: 14, x: 280.5, y: 483, w: 27 }, { d: 15, x: 385, y: 483, w: 27 },
  { d: 16, x: 482, y: 483, w: 27 }, { d: 17, x: 576.5, y: 483, w: 27 }, { d: 18, x: 684, y: 483, w: 27 },
  { d: 19, x: 72.5, y: 536, w: 27 }, { d: 20, x: 177, y: 536, w: 27 }, { d: 21, x: 280.5, y: 536, w: 27 }, { d: 22, x: 385, y: 536, w: 27 },
  { d: 23, x: 482.5, y: 536, w: 27 }, { d: 24, x: 576.5, y: 536, w: 27 }, { d: 25, x: 683, y: 536, w: 28 },
  { d: 26, x: 72.5, y: 589, w: 27 }, { d: 27, x: 177, y: 589, w: 27 }, { d: 28, x: 280.5, y: 589, w: 27 }, { d: 29, x: 385, y: 589, w: 27 },
  { d: 30, x: 482, y: 589, w: 27 }, { d: 31, x: 576.5, y: 589, w: 27 },
]

const SERVICES = [
  { name: "HES", pct: "99.8%", x: 794, y: 305.5, w: 199, tx: 819, ty: 316, px: 819, py: 346 },
  { name: "MDM", pct: "99.92%", x: 1010, y: 305.5, w: 200, tx: 1039, ty: 316, px: 1039, py: 346 },
  { name: "WFM", pct: "100%", x: 1228, y: 305.5, w: 199, tx: 1257, ty: 316, px: 1257, py: 346 },
  { name: "GIS", pct: "99.92%", x: 1444, y: 305.5, w: 200, tx: 1476, ty: 316, px: 1476, py: 346 },
  { name: "UFG", pct: "99.92%", x: 1661, y: 305.5, w: 201, tx: 1694, ty: 316, px: 1694, py: 346 },
  { name: "Gas Simulation", pct: "99.94%", x: 794, y: 408.5, w: 199, tx: 819, ty: 419, px: 819, py: 449 },
  { name: "AD / DNS", pct: "99.98%", x: 1010, y: 408.5, w: 200, tx: 1039, ty: 419, px: 1039, py: 449 },
  { name: "Central NGINX", pct: "99.93%", x: 1228, y: 408.5, w: 199, tx: 1257, ty: 419, px: 1257, py: 449 },
  { name: "ELK Logging", pct: "99.9%", x: 1444, y: 408.5, w: 200, tx: 1476, ty: 419, px: 1476, py: 449 },
  { name: "Network", pct: "99.94%", x: 1661, y: 408.5, w: 201, tx: 1694, ty: 419, px: 1694, py: 449 },
]

type Incident = {
  service: string
  type: "Degraded" | "Outage"
  started: string
  duration: string
  rowY?: number
  textY: number
  typeY: number
  pillY: number
  statusSrc: string
  typeColor: string
  typeBg: string
  typeX: number
}

const INCIDENTS: Incident[] = [
  { service: "AD / DNS", type: "Degraded", started: "29 Oct, 17:38", duration: "72 min", rowY: 630.5, textY: 644, typeY: 648, pillY: 640.5, statusSrc: statusOrange, typeColor: "#ffb14f", typeBg: "#40301a", typeX: 1036.7 },
  { service: "UFG", type: "Degraded", started: "28 Oct, 22:11", duration: "33 min", textY: 713.5, typeY: 717.5, pillY: 706.5, statusSrc: statusOrangeAlt, typeColor: "#ffb14f", typeBg: "#40301a", typeX: 1037 },
  { service: "HES", type: "Degraded", started: "27 Oct, 23:04", duration: "10 min", rowY: 765.5, textY: 778.5, typeY: 782.5, pillY: 774.5, statusSrc: statusOrange, typeColor: "#ffb14f", typeBg: "#40301a", typeX: 1037 },
  { service: "Network", type: "Outage", started: "27 Oct, 21:11", duration: "25 min", textY: 842.5, typeY: 846.5, pillY: 838.5, statusSrc: statusRedAlt, typeColor: "#ff765e", typeBg: "#41211e", typeX: 1047 },
  { service: "Network", type: "Degraded", started: "26 Oct, 14:24", duration: "16 min", rowY: 896.5, textY: 909.5, typeY: 913.5, pillY: 904.5, statusSrc: statusOrange, typeColor: "#ffb14f", typeBg: "#40301a", typeX: 1037 },
  { service: "UFG", type: "Outage", started: "25 Oct, 05:15", duration: "7.7 min", textY: 975.5, typeY: 975.5, pillY: 969.5, statusSrc: statusRedAlt, typeColor: "#ff765e", typeBg: "#41211e", typeX: 1047 },
]

function Kpi({
  x, y, w, label, value, grad = KPI_GRAD,
}: {
  x: number; y: number; w: number; label: string; value: string; grad?: string
}) {
  return (
    <>
      <div className="at" style={{ left: x, top: y, width: w, height: 134, borderRadius: 30, background: grad }} />
      <Pin x={x + 20} y={y + 11} size={24} weight={500} color={TEAL} lh={40}>{label}</Pin>
      <Pin x={x + 20} y={y + 67} size={60} weight={700} color="#fff" lh={40}>{value}</Pin>
    </>
  )
}

export function Screen1() {
  return (
    <Frame>
      <Pin x={99} y={16.75} size={32} weight={900} color={TEAL} w={644} lh={40}>OPERATIONS OVERVIEW</Pin>

      <Kpi x={42} y={62} w={297} label="Services up" value="10 / 10" />
      <Kpi x={350} y={62} w={297} label="SLA met" value="10 / 10" grad={KPI_GRAD_ALT} />
      <Kpi x={658} y={62} w={297} label="VMs reachable" value="66 / 66" />
      <Kpi x={967} y={62} w={297} label="Firewalls up" value="6 / 6" />
      <Kpi x={1275} y={62} w={297} label="Critical alerts" value="0" />
      <Kpi x={1583} y={62} w={297} label="Open incidents" value="0" />

      <div
        className="at"
        style={{
          left: 27,
          top: 234,
          width: 733,
          height: 811,
          borderRadius: 32,
          border: "1px solid rgba(43,255,255,0.32)",
          background: "linear-gradient(180deg, rgba(43,255,255,0.12) 0%, rgba(43,255,255,0.04) 50%, rgba(43,255,255,0.07) 100%)",
          backdropFilter: "blur(42px)",
        }}
      />

      <Pin x={106} y={274} size={32} weight={400} color="#9da9aa" lh={38}>‹</Pin>
      <Pin x={293} y={274} size={32} weight={700} color="#f2f6f5" w={196} lh={38} align="center">October 2026</Pin>
      <Pin x={671} y={274} size={32} weight={400} color="#9da9aa" w={10} lh={38} align="center">›</Pin>

      {WEEKDAYS.map((day) => (
        <Pin key={day.label} x={day.x} y={334} size={22} weight={400} color="#9da9aa" w={day.w} lh={26} align="center">{day.label}</Pin>
      ))}

      <ImgAt x={670.5} y={523} w={54} h={54} src={calendarDayActive} />
      {DAYS.map((day) => (
        <Pin
          key={day.d}
          x={day.x}
          y={day.y}
          size={24}
          weight={day.d === 25 ? 700 : 400}
          color={day.d === 25 ? "#071817" : "#f2f6f5"}
          w={day.w}
          lh={28}
          align="center"
        >
          {day.d}
        </Pin>
      ))}

      <Pin x={63} y={662} size={24} weight={700} color="#2de0d2" lh={28}>DATE SELECTION</Pin>
      <Pin x={63} y={702} size={18} weight={400} color="#9da9aa" lh={21}>Choose a date, month, year or range</Pin>
      <div className="at" style={{ left: 63, top: 740, width: 661, height: 60, borderRadius: 30, background: "#0c1b1c" }} />
      <Pin x={130.1} y={758} size={20} weight={400} color="#9da9aa" w={34.6} lh={23} align="center">Day</Pin>
      <Pin x={280.6} y={758} size={20} weight={400} color="#9da9aa" w={59} lh={23} align="center">Month</Pin>
      <Pin x={452.5} y={758} size={20} weight={400} color="#9da9aa" w={40.7} lh={23} align="center">Year</Pin>
      <div className="at" style={{ left: 576, top: 742, width: 147, height: 56, borderRadius: 134, background: TEAL_GRAD }} />
      <Pin x={598} y={758} size={20} weight={400} color="#071615" w={103} lh={23} align="center">Date Range</Pin>

      <Pin x={63} y={848} size={24} weight={700} color="#2de0d2" lh={28}>QUICK SELECT</Pin>
      <Pin x={63} y={888} size={18} weight={400} color="#9da9aa" lh={21}>Common time periods</Pin>
      <div className="at" style={{ left: 63, top: 941, width: 160, height: 50, borderRadius: 134, background: TEAL_GRAD }} />
      <Pin x={123} y={954} size={20} weight={400} color="#071615" w={41} lh={23} align="center">Now</Pin>
      <div className="at" style={{ left: 246, top: 941, width: 160, height: 50, borderRadius: 128, background: "#0c1b1c" }} />
      <Pin x={282} y={954} size={20} weight={400} color="#f2f6f5" w={88} lh={23} align="center">Yesterday</Pin>
      <div className="at" style={{ left: 428, top: 941, width: 160, height: 50, borderRadius: 128, background: "#0c1b1c" }} />
      <Pin x={450} y={954} size={20} weight={400} color="#f2f6f5" w={116} lh={23} align="center">Custom Date</Pin>

      <Panel x={775} y={233.5} w={1106} h={288} />
      <ImgAt x={801} y={216.5} w={1057} h={1} src={dividerTop} />
      <Pin x={799} y={250.5} size={25} weight={700} color="#f2f5f5" w={500} lh={58}>SERVICE STATUS / 10 MONITORED SERVICES</Pin>

      {SERVICES.map((svc) => (
        <div key={svc.name}>
          <div
            className="at"
            style={{
              left: svc.x,
              top: svc.y,
              width: svc.w,
              height: 83,
              borderRadius: 68,
              border: "0.5px solid #34eddc",
              background: "linear-gradient(115deg, rgba(48,48,48,0.33) 0%, rgba(26,26,26,0.33) 100%)",
            }}
          />
          <Pin x={svc.tx} y={svc.ty} size={22} weight={700} color="#e8f2f0" lh={26}>{svc.name}</Pin>
          <Pin x={svc.px} y={svc.py} size={27} weight={700} color="#34edda" lh={32}>{svc.pct}</Pin>
        </div>
      ))}

      <Panel x={773} y={541.5} w={1108} h={503} />
      <ImgAt x={794} y={617.5} w={1068} h={1} src={dividerIncidents} />
      <Pin x={795} y={554.5} size={21} weight={700} color="#e8f2f0" lh={25}>RECENT INCIDENTS / LAST 30 DAYS</Pin>
      <Pin x={844} y={593.5} size={15} weight={700} color="#8ba4a2" lh={18}>SERVICE</Pin>
      <Pin x={1069} y={593.5} size={15} weight={700} color="#8ba4a2" lh={18}>TYPE</Pin>
      <Pin x={1301} y={593.5} size={15} weight={700} color="#8ba4a2" lh={18}>STARTED</Pin>
      <Pin x={1562} y={593.5} size={15} weight={700} color="#8ba4a2" lh={18}>DURATION</Pin>
      <Pin x={1790} y={593.5} size={15} weight={700} color="#8ba4a2" lh={18}>STATE</Pin>

      {INCIDENTS.map((row, i) => (
        <div key={i}>
          {row.rowY != null && (
            <div className="at" style={{ left: 794, top: row.rowY, width: 1068, height: 58, borderRadius: 95, background: "#232323", border: "1px solid #282b2a" }} />
          )}
          <ImgAt x={811} y={row.textY + 3.5} w={9} h={26} src={row.statusSrc} />
          <Pin x={844} y={row.textY} size={27} weight={700} color="#e7f0ed" lh={32}>{row.service}</Pin>
          <div className="at" style={{ left: 1017, top: row.pillY, width: 125, height: 40, borderRadius: 46, background: row.typeBg }} />
          <Pin x={row.typeX} y={row.typeY} size={20} weight={700} color={row.typeColor} w={87} lh={23} align="center">{row.type}</Pin>
          <Pin x={1275} y={row.textY + 1} size={26} weight={400} color="#e5ecea" lh={30}>{row.started}</Pin>
          <Pin x={1560} y={row.textY + 1} size={26} weight={400} color="#e5ecea" lh={30}>{row.duration}</Pin>
          <Pin x={1726} y={row.textY + 1} size={26} weight={400} color="#e5ecea" lh={30}>Resolved</Pin>
        </div>
      ))}
    </Frame>
  )
}
