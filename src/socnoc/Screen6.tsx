import imgVector from "../assets/socnoc/screen6/imgvector.svg"
import imgVector1 from "../assets/socnoc/screen6/imgvector1.svg"
import imgVector2 from "../assets/socnoc/screen6/imgvector2.svg"
import imgVector3 from "../assets/socnoc/screen6/imgvector3.svg"
import imgVector6 from "../assets/socnoc/screen6/imgvector6.svg"
import imgVector7 from "../assets/socnoc/screen6/imgvector7.svg"
import imgVector8 from "../assets/socnoc/screen6/imgvector8.svg"
import imgVector9 from "../assets/socnoc/screen6/imgvector9.svg"
import { Frame, ImgAt, LiveBadge, Panel, Pin } from "./ui"

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEPT", "OCT", "NOV", "DEC"]

function last30DaysLabel(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(end)
  start.setDate(start.getDate() - 29)
  const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return `${fmt(start)} → ${fmt(end)} (TODAY)`
}

export function Screen6() {
  const rangeLabel = last30DaysLabel()

  return (
    <Frame>
      <LiveBadge src={imgVector} />
      <Pin x={67.0} y={30.0} size={32.0} weight={900} color="#34efde">SERVICE AVAILABILITY · DAILY</Pin>
      <Panel x={42.0} y={90.0} w={1838.0} h={953.0} grad="linear-gradient(110.26187539914015deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Pin x={68.9} y={128.0} size={25.0} weight={700} color="#f2f5f5" w={234.0}>DAILY AVAILABILITY</Pin>
      <Pin x={1309.1} y={136.0} size={17.0} weight={400} color="#9eaeae" w={98.9}>no downtime</Pin>
      <Pin x={1479.0} y={136.0} size={17.0} weight={400} color="#9eaeae" w={177.0}>downtime, within target</Pin>
      <Pin x={1738.9} y={136.0} size={17.0} weight={400} color="#9eaeae" w={94.1}>below target</Pin>
      <ImgAt x={1285.1} y={138.0} w={15.9} h={16.0} src={imgVector1} />
      <ImgAt x={1455.0} y={138.0} w={15.9} h={16.0} src={imgVector2} />
      <ImgAt x={1714.9} y={138.0} w={16.1} h={16.0} src={imgVector3} />
      <Pin x={61.1} y={196.0} size={17.0} weight={400} color="#667b7c" w={67.0}>SERVICE</Pin>
      <Pin x={317.0} y={196.0} size={17.0} weight={400} color="#667b7c" w={260.0}>{rangeLabel}</Pin>
      <Pin x={1770.0} y={196.0} size={17.0} weight={400} color="#667b7c" w={64.9} align="right">30 DAYS</Pin>
      <Pin x={61.1} y={236.0} size={18.0} weight={700} color="#379a98" w={172.0}>BUSINESS SERVICES</Pin>
      <ImgAt x={317.0} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={364.0} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={411.3} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={458.3} y={291.0} w={41.1} h={41.0} src={imgVector7} />
      <ImgAt x={505.3} y={291.0} w={41.1} h={41.0} src={imgVector8} />
      <ImgAt x={552.6} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={599.6} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={646.7} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={693.9} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={740.9} y={291.0} w={40.9} h={41.0} src={imgVector7} />
      <ImgAt x={788.0} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={835.0} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={882.2} y={291.0} w={40.9} h={41.0} src={imgVector7} />
      <ImgAt x={929.3} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={976.3} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1023.6} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1070.6} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1117.6} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1164.9} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1211.9} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1258.9} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1306.2} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1353.2} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1400.3} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1447.5} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1494.5} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1541.6} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1588.6} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1635.8} y={291.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1682.9} y={291.0} w={41.1} h={41.0} src={imgVector6} />
      <Pin x={61.1} y={298.0} size={22.0} weight={700} color="#f2f3f3" w={41.9}>HES</Pin>
      <Pin x={1772.9} y={298.0} size={23.0} weight={400} color="#dce5e5" w={62.0} align="right">99.8%</Pin>
      <ImgAt x={317.0} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={364.0} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={411.3} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={458.3} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={505.3} y={337.0} w={41.1} h={41.0} src={imgVector8} />
      <ImgAt x={552.6} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={599.6} y={337.0} w={40.9} h={41.0} src={imgVector9} />
      <ImgAt x={646.7} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={693.9} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={740.9} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={788.0} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={835.0} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={882.2} y={337.0} w={40.9} h={41.0} src={imgVector7} />
      <ImgAt x={929.3} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={976.3} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1023.6} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1070.6} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1117.6} y={337.0} w={41.1} h={41.0} src={imgVector7} />
      <ImgAt x={1164.9} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1211.9} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1258.9} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1306.2} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1353.2} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1400.3} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1447.5} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1494.5} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1541.6} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1588.6} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1635.8} y={337.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1682.9} y={337.0} w={41.1} h={41.0} src={imgVector6} />
      <Pin x={61.1} y={344.0} size={22.0} weight={700} color="#f2f3f3" w={53.0}>MDM</Pin>
      <Pin x={1760.1} y={344.0} size={23.0} weight={400} color="#dce5e5" w={74.9} align="right">99.92%</Pin>
      <ImgAt x={317.0} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={364.0} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={411.3} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={458.3} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={505.3} y={383.0} w={41.1} h={41.0} src={imgVector8} />
      <ImgAt x={552.6} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={599.6} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={646.7} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={693.9} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={740.9} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={788.0} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={835.0} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={882.2} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={929.3} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={976.3} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1023.6} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1070.6} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1117.6} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1164.9} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1211.9} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1258.9} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1306.2} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1353.2} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1400.3} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1447.5} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1494.5} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1541.6} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1588.6} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1635.8} y={383.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1682.9} y={383.0} w={41.1} h={41.0} src={imgVector6} />
      <Pin x={61.1} y={390.0} size={22.0} weight={700} color="#f2f3f3" w={50.9}>WFM</Pin>
      <Pin x={1779.1} y={390.0} size={23.0} weight={400} color="#dce5e5" w={55.9} align="right">100%</Pin>
      <ImgAt x={317.0} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={364.0} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={411.3} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={458.3} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={505.3} y={429.0} w={41.1} h={41.0} src={imgVector8} />
      <ImgAt x={552.6} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={599.6} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={646.7} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={693.9} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={740.9} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={788.0} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={835.0} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={882.2} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={929.3} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={976.3} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1023.6} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1070.6} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1117.6} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1164.9} y={429.0} w={40.9} h={41.0} src={imgVector7} />
      <ImgAt x={1211.9} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1258.9} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1306.2} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1353.2} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1400.3} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1447.5} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1494.5} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1541.6} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1588.6} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1635.8} y={429.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1682.9} y={429.0} w={41.1} h={41.0} src={imgVector6} />
      <Pin x={61.1} y={436.0} size={22.0} weight={700} color="#f2f3f3" w={34.9}>GIS</Pin>
      <Pin x={1760.1} y={436.0} size={23.0} weight={400} color="#dce5e5" w={74.9} align="right">99.92%</Pin>
      <ImgAt x={317.0} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={364.0} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={411.3} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={458.3} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={505.3} y={475.0} w={41.1} h={41.0} src={imgVector8} />
      <ImgAt x={552.6} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={599.6} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={646.7} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={693.9} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={740.9} y={475.0} w={40.9} h={41.0} src={imgVector9} />
      <ImgAt x={788.0} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={835.0} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={882.2} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={929.3} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={976.3} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1023.6} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1070.6} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1117.6} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1164.9} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1211.9} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1258.9} y={475.0} w={41.1} h={41.0} src={imgVector9} />
      <ImgAt x={1306.2} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1353.2} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1400.3} y={475.0} w={41.1} h={41.0} src={imgVector9} />
      <ImgAt x={1447.5} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1494.5} y={475.0} w={40.9} h={41.0} src={imgVector9} />
      <ImgAt x={1541.6} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1588.6} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1635.8} y={475.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1682.9} y={475.0} w={41.1} h={41.0} src={imgVector6} />
      <Pin x={61.1} y={482.0} size={22.0} weight={700} color="#f2f3f3" w={41.9}>UFG</Pin>
      <Pin x={1760.1} y={482.0} size={23.0} weight={400} color="#dce5e5" w={74.9} align="right">99.92%</Pin>
      <ImgAt x={317.0} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={364.0} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={411.3} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={458.3} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={505.3} y={521.0} w={41.1} h={41.0} src={imgVector8} />
      <ImgAt x={552.6} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={599.6} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={646.7} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={693.9} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={740.9} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={788.0} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={835.0} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={882.2} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={929.3} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={976.3} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1023.6} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1070.6} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1117.6} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1164.9} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1211.9} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1258.9} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1306.2} y={521.0} w={40.9} h={41.0} src={imgVector7} />
      <ImgAt x={1353.2} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1400.3} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1447.5} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1494.5} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1541.6} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1588.6} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1635.8} y={521.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1682.9} y={521.0} w={41.1} h={41.0} src={imgVector6} />
      <Pin x={61.1} y={528.0} size={22.0} weight={700} color="#f2f3f3" w={150.0}>Gas Simulation</Pin>
      <Pin x={1760.1} y={528.0} size={23.0} weight={400} color="#dce5e5" w={74.9} align="right">99.94%</Pin>
      <Pin x={61.1} y={603.0} size={18.0} weight={700} color="#379a98" w={180.9}>PLATFORM SERVICES</Pin>
      <ImgAt x={317.0} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={364.0} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={411.3} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={458.3} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={505.3} y={658.0} w={41.1} h={40.9} src={imgVector8} />
      <ImgAt x={552.6} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={599.6} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={646.7} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={693.9} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={740.9} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={788.0} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={835.0} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={882.2} y={658.0} w={40.9} h={40.9} src={imgVector7} />
      <ImgAt x={929.3} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={976.3} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1023.6} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1070.6} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1117.6} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1164.9} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1211.9} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1258.9} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1306.2} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1353.2} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1400.3} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1447.5} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1494.5} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1541.6} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1588.6} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1635.8} y={658.0} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1682.9} y={658.0} w={41.1} h={40.9} src={imgVector6} />
      <Pin x={61.1} y={665.0} size={22.0} weight={700} color="#f2f3f3" w={92.0}>AD / DNS</Pin>
      <Pin x={1760.1} y={665.0} size={23.0} weight={400} color="#dce5e5" w={74.9} align="right">99.98%</Pin>
      <ImgAt x={317.0} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={364.0} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={411.3} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={458.3} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={505.3} y={704.1} w={41.1} h={40.9} src={imgVector8} />
      <ImgAt x={552.6} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={599.6} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={646.7} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={693.9} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={740.9} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={788.0} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={835.0} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={882.2} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={929.3} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={976.3} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1023.6} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1070.6} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1117.6} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1164.9} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1211.9} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1258.9} y={704.1} w={41.1} h={40.9} src={imgVector7} />
      <ImgAt x={1306.2} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1353.2} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1400.3} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1447.5} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1494.5} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1541.6} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1588.6} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <ImgAt x={1635.8} y={704.1} w={40.9} h={40.9} src={imgVector6} />
      <ImgAt x={1682.9} y={704.1} w={41.1} h={40.9} src={imgVector6} />
      <Pin x={61.1} y={711.0} size={22.0} weight={700} color="#f2f3f3" w={144.0}>Central NGINX</Pin>
      <Pin x={1760.1} y={711.0} size={23.0} weight={400} color="#dce5e5" w={74.9} align="right">99.93%</Pin>
      <ImgAt x={317.0} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={364.0} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={411.3} y={750.0} w={40.9} h={41.0} src={imgVector7} />
      <ImgAt x={458.3} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={505.3} y={750.0} w={41.1} h={41.0} src={imgVector8} />
      <ImgAt x={552.6} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={599.6} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={646.7} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={693.9} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={740.9} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={788.0} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={835.0} y={750.0} w={41.1} h={41.0} src={imgVector9} />
      <ImgAt x={882.2} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={929.3} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={976.3} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1023.6} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1070.6} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1117.6} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1164.9} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1211.9} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1258.9} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1306.2} y={750.0} w={40.9} h={41.0} src={imgVector7} />
      <ImgAt x={1353.2} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1400.3} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1447.5} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1494.5} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1541.6} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1588.6} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1635.8} y={750.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1682.9} y={750.0} w={41.1} h={41.0} src={imgVector6} />
      <Pin x={61.1} y={757.0} size={22.0} weight={700} color="#f2f3f3" w={124.0}>ELK Logging</Pin>
      <Pin x={1772.9} y={757.0} size={23.0} weight={400} color="#dce5e5" w={62.0} align="right">99.9%</Pin>
      <ImgAt x={317.0} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={364.0} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={411.3} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={458.3} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={505.3} y={796.0} w={41.1} h={41.0} src={imgVector8} />
      <ImgAt x={552.6} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={599.6} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={646.7} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={693.9} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={740.9} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={788.0} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={835.0} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={882.2} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={929.3} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={976.3} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1023.6} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1070.6} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1117.6} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1164.9} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1211.9} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1258.9} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1306.2} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1353.2} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1400.3} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1447.5} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1494.5} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1541.6} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <ImgAt x={1588.6} y={796.0} w={41.1} h={41.0} src={imgVector7} />
      <ImgAt x={1635.8} y={796.0} w={40.9} h={41.0} src={imgVector6} />
      <ImgAt x={1682.9} y={796.0} w={41.1} h={41.0} src={imgVector6} />
      <Pin x={61.1} y={803.0} size={22.0} weight={700} color="#f2f3f3" w={83.9}>Network</Pin>
      <Pin x={1760.1} y={803.0} size={23.0} weight={400} color="#dce5e5" w={74.9} align="right">99.94%</Pin>
    </Frame>
  )
}
