const EFFECT_POOL_SIZE = 4

const clampVolume = (value) => Math.min(Math.max(Number(value) || 0, 0), 1)

export default class AudioManager {
    musicAudio = null
    musicSrc = null
    onMusicEnded = null
    effectPools = new Map()

    setMusicSettings({ muted, volume }) {
        if (!this.musicAudio) {
            return
        }

        this.musicAudio.muted = muted
        this.musicAudio.volume = clampVolume(volume)
    }

    async playTrack(src, settings) {
        if (!src) {
            return false
        }

        if (!this.musicAudio || this.musicSrc !== src) {
            this.musicAudio?.pause()
            this.musicAudio = new Audio(src)
            this.musicAudio.loop = false
            this.musicAudio.preload = 'auto'
            this.musicAudio.onended = () => this.onMusicEnded?.()
            this.musicSrc = src
        }

        this.setMusicSettings(settings)

        try {
            await this.musicAudio.play()
            return true
        } catch {
            return false
        }
    }

    async toggleMusic() {
        if (!this.musicAudio) {
            return null
        }

        if (this.musicAudio.paused) {
            try {
                await this.musicAudio.play()
                return true
            } catch {
                return false
            }
        }

        this.musicAudio.pause()
        return false
    }

    stopMusic() {
        if (!this.musicAudio) {
            return false
        }

        this.musicAudio.pause()
        this.musicAudio.currentTime = 0
        return true
    }

    setOnMusicEnded(handler) {
        this.onMusicEnded = handler
    }

    playEffect(src, volume) {
        if (!src) {
            return false
        }

        const pool = this.effectPools.get(src) || []
        let audio = pool.find((item) => item.paused || item.ended)

        if (!audio && pool.length < EFFECT_POOL_SIZE) {
            audio = new Audio(src)
            audio.preload = 'auto'
            pool.push(audio)
            this.effectPools.set(src, pool)
        }

        if (!audio) {
            audio = pool[0]
        }

        audio.pause()
        audio.currentTime = 0
        audio.volume = clampVolume(volume)
        void audio.play().catch(() => {})
        return true
    }

    destroy() {
        this.musicAudio?.pause()
        this.onMusicEnded = null
        this.effectPools.forEach((pool) => {
            pool.forEach((audio) => audio.pause())
        })
        this.effectPools.clear()
    }
}
