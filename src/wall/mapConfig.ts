import baseUrl from "../assets/map/base.png"
import selectedUrl from "../assets/map/selected.png"
import modelUrl from "../assets/map/azerbaijan.glb?url"
import content from "../data/content.json"

// The nine centre screens share one map. Change numbers here; the wall has no sliders.
// A synced region id replaces regionId while it is set.
//
// узоры %            patternPercent, selectedPatternPercent
// затемнение %       dimPercent
// обводка            borderWidth
// боковой свет       sideLight
// фоновый свет       ambientLight
// угол света         lightAzimuth
// высота света       lightElevation
// размер текста      textSize
// высота подъёма     lift
//
// Region ids: baku, absheron-khizi, guba-khachmaz, daghlig-shirvan,
// sheki-zagatala, central-aran, karabakh, ganja-dashkasan, gazakh-tovuz,
// east-zangezur, mil-mughan, shirvan-salyan, lankaran-astara, nakhchivan.

export const mapConfig = {
  model: modelUrl,
  baseTexture: baseUrl,
  selectedTexture: selectedUrl,

  patternPercent: 30,
  selectedPatternPercent: 30,
  dimPercent: 35,
  borderWidth: 2,
  sideLight: 5.25,
  ambientLight: 1,
  lightAzimuth: 279,
  lightElevation: 30,
  textSize: 35,
  lift: 0.185,

  city: "BAKU",
  markerX: 1.493379,
  markerY: -0.161147,
  labelOffset: 52,
  regionId: "baku",

  // Locked camera, same on every tile so the land meets at the bezels.
  cameraAzimuth: 0,
  cameraElevation: 0.88,
  zoom: 0.95,
  targetX: 0,
  targetY: 0.03,
  targetZ: 0.22,
}

export const mapRegions = content.regions
