import { Screen1 } from "./Screen1"
import { Screen2 } from "./Screen2"
import { Screen3 } from "./Screen3"
import { Screen4 } from "./Screen4"
import { Screen5 } from "./Screen5"
import { Screen6 } from "./Screen6"
import { Screen7 } from "./Screen7"
import { Screen8 } from "./Screen8"
import { Screen9 } from "./Screen9"
import { Screen10 } from "./Screen10"
import { Screen11 } from "./Screen11"
import { Screen12 } from "./Screen12"
import { EmptySocnocScreen } from "./ui"

export function SocnocScreen({ id }: { id: number }) {
  switch (id) {
    case 1:
      return <Screen1 />
    case 2:
      return <Screen2 />
    case 3:
      return <Screen3 />
    case 4:
      return <Screen4 />
    case 5:
      return <Screen5 />
    case 6:
      return <Screen6 />
    case 7:
      return <Screen7 />
    case 8:
      return <Screen8 />
    case 9:
      return <Screen9 />
    case 10:
      return <Screen10 />
    case 11:
      return <Screen11 />
    case 12:
      return <Screen12 />
    default:
      return <EmptySocnocScreen />
  }
}
