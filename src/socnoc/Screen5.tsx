import imgVector from "../assets/socnoc/screen5/imgvector.svg"
import imgVector1 from "../assets/socnoc/screen5/imgvector1.svg"
import imgVector10 from "../assets/socnoc/screen5/imgvector10.svg"
import imgVector11 from "../assets/socnoc/screen5/imgvector11.svg"
import imgVector12 from "../assets/socnoc/screen5/imgvector12.svg"
import imgVector13 from "../assets/socnoc/screen5/imgvector13.svg"
import imgVector14 from "../assets/socnoc/screen5/imgvector14.svg"
import imgVector15 from "../assets/socnoc/screen5/imgvector15.svg"
import imgVector16 from "../assets/socnoc/screen5/imgvector16.svg"
import imgVector17 from "../assets/socnoc/screen5/imgvector17.svg"
import imgVector18 from "../assets/socnoc/screen5/imgvector18.svg"
import imgVector19 from "../assets/socnoc/screen5/imgvector19.svg"
import imgVector2 from "../assets/socnoc/screen5/imgvector2.svg"
import imgVector20 from "../assets/socnoc/screen5/imgvector20.svg"
import imgVector21 from "../assets/socnoc/screen5/imgvector21.svg"
import imgVector22 from "../assets/socnoc/screen5/imgvector22.svg"
import imgVector23 from "../assets/socnoc/screen5/imgvector23.svg"
import imgVector3 from "../assets/socnoc/screen5/imgvector3.svg"
import imgVector4 from "../assets/socnoc/screen5/imgvector4.svg"
import imgVector6 from "../assets/socnoc/screen5/imgvector6.svg"
import imgVector7 from "../assets/socnoc/screen5/imgvector7.svg"
import imgVector8 from "../assets/socnoc/screen5/imgvector8.svg"
import imgVector9 from "../assets/socnoc/screen5/imgvector9.svg"
import { Frame, ImgAt, LiveBadge, Panel, Pin } from "./ui"

export function Screen5() {
  return (
    <Frame>
      <LiveBadge src={imgVector} />
      <Pin x={67.0} y={30.0} size={32.0} weight={900} color="#34efde" lh={40}>{"SERVICE AVAILABILITY & SLA · LAST 30 DAYS"}</Pin>
      <Panel x={42.0} y={90.0} w={1838.0} h={953.0} grad="linear-gradient(110.26187539914015deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      {[191.5, 233.5, 300.5, 374.5, 448.5, 522.5, 596.5, 670.5, 715.0, 785.5, 859.5, 933.5].map((y) => (
        <ImgAt key={y} x={67} y={y} w={1791} h={1} src={imgVector1} />
      ))}
      <Pin x={73.9} y={108.0} size={25.0} weight={700} color="#f2f5f5" w={193.2}>SERVICE LEVELS</Pin>
      <Pin x={1450.9} y={158.0} size={17.0} weight={400} color="#607374" w={90.0}>DOWNTIME</Pin>
      <Pin x={67.0} y={158.5} size={17.0} weight={400} color="#607374" w={61.1}>STATUS</Pin>
      <Pin x={253.1} y={158.5} size={17.0} weight={400} color="#607374" w={67.0}>SERVICE</Pin>
      <Pin x={500.0} y={158.5} size={17.0} weight={400} color="#607374" w={106.9}>AVAILABILITY</Pin>
      <Pin x={985.9} y={158.5} size={17.0} weight={400} color="#607374" w={63.2}>TARGET</Pin>
      <Pin x={1086.9} y={158.5} size={17.0} weight={400} color="#607374" w={164.2}>ERROR BUDGET LEFT</Pin>
      <Pin x={1593.0} y={158.5} size={17.0} weight={400} color="#607374" w={86.0}>INCIDENTS</Pin>
      <Pin x={1776.0} y={158.5} size={17.0} weight={400} color="#607374" w={46.1}>MTTR</Pin>
      <Pin x={67.0} y={199.5} size={19.0} weight={700} color="#4b9d9e" w={182.0}>BUSINESS SERVICES</Pin>
      <Pin x={255.9} y={250.5} size={23.0} weight={700} color="#e4ebea" w={45.1}>HES</Pin>
      <Pin x={507.1} y={250.5} size={23.0} weight={400} color="#e4ebea" w={63.0}>99.8%</Pin>
      <Pin x={95.0} y={251.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={251.5} size={22.0} weight={400} color="#e4ebea" w={61.1}>99.5%</Pin>
      <Pin x={1086.9} y={251.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>67%</Pin>
      <Pin x={1450.9} y={251.5} size={22.0} weight={400} color="#e4ebea" w={69.1}>72 min</Pin>
      <Pin x={1628.0} y={251.5} size={22.0} weight={400} color="#e4ebea">3</Pin>
      <Pin x={1784.1} y={251.5} size={22.0} weight={400} color="#e4ebea" w={68.9}>24 min</Pin>
      <ImgAt x={67.0} y={257.5} w={16.9} h={18.0} src={imgVector2} />
      <ImgAt x={628.0} y={259.5} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={259.5} w={297.0} h={12.0} src={imgVector4} />
      <ImgAt x={1198.1} y={259.5} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={259.5} w={121.9} h={12.0} src={imgVector7} />
      <Pin x={255.9} y={324.5} size={23.0} weight={700} color="#e4ebea" w={57.0}>MDM</Pin>
      <Pin x={507.1} y={324.5} size={23.0} weight={400} color="#e4ebea" w={77.0}>99.92%</Pin>
      <Pin x={95.0} y={325.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={325.5} size={22.0} weight={400} color="#e4ebea" w={61.1}>99.5%</Pin>
      <Pin x={1086.9} y={325.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>84%</Pin>
      <Pin x={1450.9} y={325.5} size={22.0} weight={400} color="#e4ebea" w={69.1}>34 min</Pin>
      <Pin x={1628.0} y={325.5} size={22.0} weight={400} color="#e4ebea">3</Pin>
      <Pin x={1784.1} y={325.5} size={22.0} weight={400} color="#e4ebea" w={68.9}>11 min</Pin>
      <ImgAt x={67.0} y={331.5} w={16.9} h={18.0} src={imgVector2} />
      <ImgAt x={628.0} y={333.5} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={333.5} w={297.0} h={12.0} src={imgVector8} />
      <ImgAt x={1198.1} y={333.5} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={333.5} w={154.0} h={12.0} src={imgVector9} />
      <Pin x={255.9} y={398.5} size={23.0} weight={700} color="#e4ebea" w={54.1}>WFM</Pin>
      <Pin x={507.1} y={398.5} size={23.0} weight={400} color="#e4ebea" w={56.8}>100%</Pin>
      <Pin x={95.0} y={399.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={399.5} size={22.0} weight={400} color="#e4ebea" w={61.1}>99.0%</Pin>
      <Pin x={1086.9} y={399.5} size={22.0} weight={400} color="#e4ebea" w={55.1}>100%</Pin>
      <Pin x={1450.9} y={399.5} size={22.0} weight={400} color="#e4ebea" w={56.1}>0 min</Pin>
      <Pin x={1628.0} y={399.5} size={22.0} weight={400} color="#e4ebea">0</Pin>
      <Pin x={1810.0} y={399.5} size={22.0} weight={400} color="#e4ebea">—</Pin>
      <ImgAt x={67.0} y={405.5} w={16.9} h={17.9} src={imgVector2} />
      <ImgAt x={628.0} y={407.5} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={407.5} w={297.0} h={12.0} src={imgVector10} />
      <ImgAt x={1198.1} y={407.5} w={150.9} h={12.0} src={imgVector11} />
      <ImgAt x={1198.1} y={407.5} w={183.0} h={12.0} src={imgVector12} />
      <Pin x={255.9} y={472.5} size={23.0} weight={700} color="#e4ebea" w={37.1}>GIS</Pin>
      <Pin x={507.1} y={472.5} size={23.0} weight={400} color="#e4ebea" w={77.0}>99.92%</Pin>
      <Pin x={95.0} y={473.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={473.5} size={22.0} weight={400} color="#e4ebea" w={61.1}>99.0%</Pin>
      <Pin x={1086.9} y={473.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>92%</Pin>
      <Pin x={1450.9} y={473.5} size={22.0} weight={400} color="#e4ebea" w={69.1}>34 min</Pin>
      <Pin x={1628.9} y={473.5} size={22.0} weight={400} color="#e4ebea">1</Pin>
      <Pin x={1784.1} y={473.5} size={22.0} weight={400} color="#e4ebea" w={68.9}>34 min</Pin>
      <ImgAt x={67.0} y={479.5} w={16.9} h={17.9} src={imgVector2} />
      <ImgAt x={628.0} y={481.5} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={481.5} w={297.0} h={12.0} src={imgVector8} />
      <ImgAt x={1198.1} y={481.5} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={481.5} w={168.0} h={12.0} src={imgVector13} />
      <Pin x={255.9} y={546.5} size={23.0} weight={700} color="#e4ebea" w={45.1}>UFG</Pin>
      <Pin x={507.1} y={546.5} size={23.0} weight={400} color="#e4ebea" w={77.0}>99.92%</Pin>
      <Pin x={95.0} y={547.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={547.5} size={22.0} weight={400} color="#e4ebea" w={61.1}>99.0%</Pin>
      <Pin x={1086.9} y={547.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>93%</Pin>
      <Pin x={1450.9} y={547.5} size={22.0} weight={400} color="#e4ebea" w={69.1}>32 min</Pin>
      <Pin x={1628.9} y={547.5} size={22.0} weight={400} color="#e4ebea">4</Pin>
      <Pin x={1784.1} y={547.5} size={22.0} weight={400} color="#e4ebea" w={73.9}>8.1 min</Pin>
      <ImgAt x={67.0} y={553.5} w={16.9} h={18.0} src={imgVector2} />
      <ImgAt x={628.0} y={555.6} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={555.6} w={297.0} h={12.0} src={imgVector8} />
      <ImgAt x={1198.1} y={555.6} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={555.6} w={170.9} h={12.0} src={imgVector14} />
      <Pin x={255.9} y={620.5} size={23.0} weight={700} color="#e4ebea" w={160.1}>Gas Simulation</Pin>
      <Pin x={507.1} y={620.5} size={23.0} weight={400} color="#e4ebea" w={77.0}>99.94%</Pin>
      <Pin x={95.0} y={621.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={621.5} size={22.0} weight={400} color="#e4ebea" w={61.1}>99.0%</Pin>
      <Pin x={1086.9} y={621.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>94%</Pin>
      <Pin x={1450.9} y={621.5} size={22.0} weight={400} color="#e4ebea" w={69.1}>24 min</Pin>
      <Pin x={1628.9} y={621.5} size={22.0} weight={400} color="#e4ebea">2</Pin>
      <Pin x={1784.1} y={621.5} size={22.0} weight={400} color="#e4ebea" w={68.9}>12 min</Pin>
      <ImgAt x={67.0} y={627.5} w={16.9} h={18.0} src={imgVector2} />
      <ImgAt x={628.0} y={629.5} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={629.5} w={297.0} h={12.0} src={imgVector15} />
      <ImgAt x={1198.1} y={629.5} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={629.5} w={171.8} h={12.0} src={imgVector16} />
      <Pin x={67.0} y={683.0} size={19.0} weight={700} color="#4b9d9e" w={191.0}>PLATFORM SERVICES</Pin>
      <Pin x={255.9} y={735.5} size={23.0} weight={700} color="#e4ebea" w={98.1}>AD / DNS</Pin>
      <Pin x={507.1} y={735.5} size={23.0} weight={400} color="#e4ebea" w={77.0}>99.98%</Pin>
      <Pin x={95.0} y={736.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={736.5} size={22.0} weight={400} color="#e4ebea" w={73.2}>99.90%</Pin>
      <Pin x={1086.9} y={736.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>85%</Pin>
      <Pin x={1450.9} y={736.5} size={22.0} weight={400} color="#e4ebea" w={74.1}>6.3 min</Pin>
      <Pin x={1628.9} y={736.5} size={22.0} weight={400} color="#e4ebea">1</Pin>
      <Pin x={1784.1} y={736.5} size={22.0} weight={400} color="#e4ebea" w={73.9}>6.3 min</Pin>
      <ImgAt x={67.0} y={742.5} w={16.9} h={18.0} src={imgVector2} />
      <ImgAt x={628.0} y={744.6} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={744.6} w={297.0} h={12.0} src={imgVector17} />
      <ImgAt x={1198.1} y={744.6} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={744.6} w={154.9} h={12.0} src={imgVector18} />
      <Pin x={255.9} y={809.5} size={23.0} weight={700} color="#e4ebea" w={154.0}>Central NGINX</Pin>
      <Pin x={507.1} y={809.5} size={23.0} weight={400} color="#e4ebea" w={77.0}>99.93%</Pin>
      <Pin x={95.0} y={810.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={810.5} size={22.0} weight={400} color="#e4ebea" w={73.2}>99.90%</Pin>
      <Pin x={1086.9} y={810.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>31%</Pin>
      <Pin x={1450.9} y={810.5} size={22.0} weight={400} color="#e4ebea" w={69.1}>30 min</Pin>
      <Pin x={1628.9} y={810.5} size={22.0} weight={400} color="#e4ebea">1</Pin>
      <Pin x={1784.1} y={810.5} size={22.0} weight={400} color="#e4ebea" w={68.9}>30 min</Pin>
      <ImgAt x={67.0} y={816.5} w={16.9} h={18.0} src={imgVector2} />
      <ImgAt x={628.0} y={818.5} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={818.5} w={297.0} h={12.0} src={imgVector19} />
      <ImgAt x={1198.1} y={818.5} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={818.5} w={56.8} h={12.0} src={imgVector20} />
      <Pin x={255.9} y={883.5} size={23.0} weight={700} color="#e4ebea" w={132.1}>ELK Logging</Pin>
      <Pin x={507.1} y={883.5} size={23.0} weight={400} color="#e4ebea" w={63.0}>99.9%</Pin>
      <Pin x={95.0} y={884.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={884.5} size={22.0} weight={400} color="#e4ebea" w={61.1}>99.0%</Pin>
      <Pin x={1086.9} y={884.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>90%</Pin>
      <Pin x={1450.9} y={884.5} size={22.0} weight={400} color="#e4ebea" w={69.1}>44 min</Pin>
      <Pin x={1628.9} y={884.5} size={22.0} weight={400} color="#e4ebea">3</Pin>
      <Pin x={1784.1} y={884.5} size={22.0} weight={400} color="#e4ebea" w={68.9}>15 min</Pin>
      <ImgAt x={67.0} y={890.5} w={16.9} h={18.0} src={imgVector2} />
      <ImgAt x={628.0} y={892.5} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={892.5} w={297.0} h={12.0} src={imgVector21} />
      <ImgAt x={1198.1} y={892.5} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={892.5} w={164.9} h={12.0} src={imgVector22} />
      <Pin x={255.9} y={957.5} size={23.0} weight={700} color="#e4ebea" w={89.1}>Network</Pin>
      <Pin x={507.1} y={957.5} size={23.0} weight={400} color="#e4ebea" w={77.0}>99.94%</Pin>
      <Pin x={95.0} y={958.5} size={22.0} weight={400} color="#819394">Up</Pin>
      <Pin x={985.9} y={958.5} size={22.0} weight={400} color="#e4ebea" w={73.2}>99.90%</Pin>
      <Pin x={1086.9} y={958.5} size={22.0} weight={400} color="#e4ebea" w={42.0}>42%</Pin>
      <Pin x={1450.9} y={958.5} size={22.0} weight={400} color="#e4ebea" w={69.1}>25 min</Pin>
      <Pin x={1628.9} y={958.5} size={22.0} weight={400} color="#e4ebea">1</Pin>
      <Pin x={1784.1} y={958.5} size={22.0} weight={400} color="#e4ebea" w={68.9}>25 min</Pin>
      <ImgAt x={67.0} y={964.5} w={16.9} h={17.9} src={imgVector2} />
      <ImgAt x={628.0} y={966.5} w={297.0} h={12.0} src={imgVector3} />
      <ImgAt x={628.0} y={966.5} w={297.0} h={12.0} src={imgVector15} />
      <ImgAt x={1198.1} y={966.5} w={183.0} h={12.0} src={imgVector6} />
      <ImgAt x={1198.1} y={966.5} w={75.8} h={12.0} src={imgVector23} />
    </Frame>
  )
}
