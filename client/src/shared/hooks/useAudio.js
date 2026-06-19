import { useContext } from 'react'

import AudioContext from '@/shared/context/audioContext.js'

const useAudio = () => {
    const context = useContext(AudioContext)

    if (!context) {
        throw new Error('useAudio must be used within AudioProvider')
    }

    return context
}

export default useAudio
