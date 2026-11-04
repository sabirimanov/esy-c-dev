import liveBadge from "../assets/socnoc/screen10/live-badge.svg"
import connDot from "../assets/socnoc/screen10/conn-dot.svg"
import sharedDivider from "../assets/socnoc/screen10/shared-divider.svg"
import line01 from "../assets/socnoc/screen10/line-01.svg"
import line02 from "../assets/socnoc/screen10/line-02.svg"
import line03 from "../assets/socnoc/screen10/line-03.svg"
import line04 from "../assets/socnoc/screen10/line-04.svg"
import line05 from "../assets/socnoc/screen10/line-05.svg"
import line06 from "../assets/socnoc/screen10/line-06.svg"
import line07 from "../assets/socnoc/screen10/line-07.svg"
import line08 from "../assets/socnoc/screen10/line-08.svg"
import line09 from "../assets/socnoc/screen10/line-09.svg"
import line10 from "../assets/socnoc/screen10/line-10.svg"
import line11 from "../assets/socnoc/screen10/line-11.svg"
import line12 from "../assets/socnoc/screen10/line-12.svg"
import line13 from "../assets/socnoc/screen10/line-13.svg"
import line14 from "../assets/socnoc/screen10/line-14.svg"
import line15 from "../assets/socnoc/screen10/line-15.svg"
import { Frame, ImgAt, LiveBadge, Panel, Pin, TEAL } from "./ui"

const NODE_GRAD = "linear-gradient(131deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)"

type MapNode = { x: number; y: number; title: string; sub: string }

const COL_HEADERS = [
  { x: 121, label: "ENTRY" },
  { x: 491, label: "WEB" },
  { x: 852, label: "APPLICATION" },
  { x: 1203, label: "INTEGRATION · REPORTING" },
  { x: 1558, label: "DATA" },
]

const NODES: MapNode[] = [
  { x: 94, y: 361, title: "Firewalls (FortiGate)", sub: "6 / 6 VMs · up" },
  { x: 94, y: 531, title: "Central NGINX", sub: "1 / 1 VMs · up" },
  { x: 453, y: 172, title: "HES web", sub: "2 / 2 VMs · up" },
  { x: 453, y: 380, title: "MDM web", sub: "2 / 2 VMs · up" },
  { x: 453, y: 471, title: "WFM web", sub: "2 / 2 VMs · up" },
  { x: 453, y: 581, title: "UFG web", sub: "2 / 2 VMs · up" },
  { x: 453, y: 691, title: "Gas Simulation", sub: "2 / 2 VMs · up" },
  { x: 453, y: 801, title: "GIS web", sub: "1 / 1 VMs · up" },
  { x: 812, y: 172, title: "HES application", sub: "3 / 3 VMs · up" },
  { x: 812, y: 263, title: "HES integration / batch", sub: "2 / 2 VMs · up" },
  { x: 812, y: 380, title: "MDM application (VEE)", sub: "3 / 3 VMs · up" },
  { x: 812, y: 471, title: "WFM application", sub: "2 / 2 VMs · up" },
  { x: 812, y: 581, title: "UFG backend (Celery)", sub: "2 / 2 VMs · up" },
  { x: 812, y: 809, title: "ArcGIS Portal / Server", sub: "5 / 5 VMs · up" },
  { x: 1170, y: 263, title: "RabbitMQ", sub: "3 / 3 VMs · up" },
  { x: 1170, y: 336, title: "MDM reporting", sub: "1 / 1 VMs · up" },
  { x: 1530, y: 172, title: "HES DB (PostgreSQL)", sub: "3 / 3 VMs · up" },
  { x: 1530, y: 424, title: "MDM / WFM DB (PostgreSQL)", sub: "3 / 3 VMs · up" },
  { x: 1530, y: 581, title: "UFG DB (TimescaleDB)", sub: "2 / 2 VMs · up" },
  { x: 1530, y: 690, title: "Gas Simulation DB", sub: "2 / 2 VMs · up" },
  { x: 1530, y: 801, title: "GIS geodatabase", sub: "3 / 3 VMs · up" },
]

const CONN_DOTS = [
  { x: 442, y: 199 }, { x: 752, y: 199 }, { x: 802, y: 199 }, { x: 1111, y: 199 }, { x: 1519, y: 199 },
  { x: 442, y: 408 }, { x: 752, y: 408 }, { x: 802, y: 408 }, { x: 1111, y: 408 }, { x: 1159, y: 291 },
  { x: 1159, y: 364 }, { x: 442, y: 498 }, { x: 752, y: 498 }, { x: 802, y: 498 }, { x: 1111, y: 498 },
  { x: 1519, y: 454 }, { x: 442, y: 609 }, { x: 752, y: 609 }, { x: 802, y: 609 }, { x: 1111, y: 609 },
  { x: 1519, y: 609 }, { x: 442, y: 718 }, { x: 752, y: 717 }, { x: 1519, y: 718 },
  { x: 442, y: 827 }, { x: 752, y: 827 }, { x: 802, y: 827 }, { x: 1111, y: 827 }, { x: 1519, y: 827 },
]

function figmaInset(t: number, r: number, b: number, l: number) {
  const W = 1920
  const H = 1080
  const x = (l / 100) * W
  const y = (t / 100) * H
  const w = ((100 - l - r) / 100) * W
  const h = ((100 - t - b) / 100) * H
  return { x, y, w: Math.max(w, 1), h: Math.max(h, 1) }
}

const LINES: { src: string; t: number; r: number; b: number; l: number }[] = [
  { src: line01, t: 39.65, r: 87.35, b: 50.8, l: 12.65 },
  { src: line02, t: 18.98, r: 76.42, b: 47.8, l: 20.52 },
  { src: line03, t: 38.43, r: 76.42, b: 47.8, l: 20.52 },
  { src: line04, t: 46.65, r: 76.42, b: 47.8, l: 20.52 },
  { src: line05, t: 52.2, r: 76.42, b: 43.13, l: 20.52 },
  { src: line06, t: 52.2, r: 76.42, b: 33.02, l: 20.52 },
  { src: line07, t: 52.2, r: 76.42, b: 22.91, l: 20.52 },
  { src: line08, t: 18.98, r: 57.73, b: 81.02, l: 39.15 },
  { src: line08, t: 38.43, r: 57.73, b: 61.57, l: 39.15 },
  { src: line08, t: 46.65, r: 57.73, b: 53.35, l: 39.15 },
  { src: line08, t: 56.87, r: 57.73, b: 43.13, l: 39.15 },
  { src: line08, t: 77.09, r: 57.73, b: 22.91, l: 39.15 },
  { src: line09, t: 22.09, r: 49.92, b: 75.69, l: 50.08 },
  { src: line10, t: 27.31, r: 39.11, b: 61.57, l: 57.92 },
  { src: line11, t: 34.17, r: 39.11, b: 61.57, l: 57.92 },
  { src: line12, t: 38.43, r: 20.22, b: 57.46, l: 57.97 },
  { src: line13, t: 42.54, r: 20.35, b: 53.35, l: 57.83 },
  { src: line14, t: 18.98, r: 20.35, b: 81.02, l: 57.83 },
  { src: line14, t: 56.87, r: 20.35, b: 43.13, l: 57.83 },
  { src: line15, t: 66.98, r: 20.35, b: 33.02, l: 39.15 },
  { src: line14, t: 77.09, r: 20.35, b: 22.91, l: 57.83 },
]

function DepNode({ x, y, title, sub }: MapNode) {
  return (
    <>
      <div
        className="at"
        style={{
          left: x,
          top: y,
          width: 299,
          height: 67,
          borderRadius: 68,
          border: "1px solid #34eddc",
          background: NODE_GRAD,
        }}
      />
      <Pin x={x + 14} y={y + 10} size={19.2} weight={400} color="#e4e8e7">{title}</Pin>
      <Pin x={x + 14} y={y + 34} size={16.8} weight={400} color="#839091">{sub}</Pin>
    </>
  )
}

export function Screen10() {
  return (
    <Frame>
      <Pin x={67} y={30} size={32} weight={900} color={TEAL} lh={40}>SERVICE DEPENDENCY MAP</Pin>
      <LiveBadge src={liveBadge} />

      <Panel x={42} y={90} w={1838} h={953} grad="linear-gradient(110deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />

      {COL_HEADERS.map((c) => (
        <Pin key={c.label} x={c.x} y={127} size={19.2} weight={400} color="#5c696a">{c.label}</Pin>
      ))}

      {LINES.map((line, i) => {
        const b = figmaInset(line.t, line.r, line.b, line.l)
        return <ImgAt key={i} x={b.x} y={b.y} w={b.w} h={b.h} src={line.src} />
      })}
      <ImgAt x={94} y={911} w={1732} h={2} src={sharedDivider} />

      {NODES.map((n) => (
        <DepNode key={`${n.title}-${n.x}-${n.y}`} {...n} />
      ))}

      {CONN_DOTS.map((d, i) => (
        <ImgAt key={i} x={d.x} y={d.y} w={11} h={11} src={connDot} />
      ))}

      <Pin x={98} y={961} size={19.2} weight={400} color={TEAL} lh={23}>SHARED SERVICES</Pin>
      <DepNode x={453} y={939} title="AD / DNS" sub="2 / 2 VMs · up" />
      <DepNode x={812} y={939} title="ELK logging" sub="3 / 3 VMs · up" />
      <DepNode x={1530} y={939} title="Backup" sub="1 / 1 VMs · up" />
    </Frame>
  )
}
