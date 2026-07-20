import modeSolo from './assets/mode_solo.png'
import mode1vs1 from './assets/mode_1vs1.png'
import mode2vs2 from './assets/mode_2vs2.png'
import mode5vs5 from './assets/mode_5vs5.png'
import modeRoyale from './assets/mode_royal.png'

export const gameModesMeta = [
    { key: 'solo', to: '/game/solo/casual', image: modeSolo, tone: 'violet' },
    { key: '1v1', to: '/game/1v1/ranked', image: mode1vs1, tone: 'blue' },
    { key: '2v2', to: '/game/2v2/ranked', image: mode2vs2, tone: 'green' },
    { key: '5v5', to: '/game/5v5/ranked', image: mode5vs5, tone: 'orange' },
    { key: 'royale', to: '/game/royale/ranked', image: modeRoyale, tone: 'magenta' },
]
