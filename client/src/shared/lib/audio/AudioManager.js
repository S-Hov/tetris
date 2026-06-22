const EFFECT_POOL_SIZE = 4

const clampVolume = (value) => Math.min(Math.max(Number(value) || 0, 0), 1)

export default class AudioManager {
    musicAudio = null
    musicSrc = null
    onMusicEnded = null
    effectPools = new Map()
    synthAudioContext = null

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

    playSynthEffect(config = {}, volume = 1) {
        const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext

        if (!AudioContextClass || !Array.isArray(config.voices) || config.voices.length === 0) {
            return false
        }

        this.synthAudioContext ||= new AudioContextClass()
        const context = this.synthAudioContext
        const masterGain = context.createGain()
        const now = context.currentTime

        masterGain.gain.setValueAtTime(clampVolume(volume), now)
        masterGain.connect(context.destination)
        void context.resume?.()

        config.voices.forEach((voice) => {
            const oscillator = context.createOscillator()
            const gain = context.createGain()
            const startsAt = now + Math.max(0, Number(voice.delay) || 0)
            const duration = Math.max(0.03, Number(voice.duration) || 0.2)
            const attack = Math.min(duration * 0.4, Math.max(0.005, Number(voice.attack) || 0.015))
            const endsAt = startsAt + duration
            const peakGain = clampVolume(voice.gain ?? 0.5)
            const startFrequency = Math.max(20, Number(voice.frequency) || 120)
            const endFrequency = Math.max(20, Number(voice.endFrequency) || startFrequency)

            oscillator.type = voice.type || 'sine'
            oscillator.frequency.setValueAtTime(startFrequency, startsAt)
            oscillator.frequency.exponentialRampToValueAtTime(endFrequency, endsAt)
            gain.gain.setValueAtTime(0.0001, startsAt)
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakGain), startsAt + attack)
            gain.gain.exponentialRampToValueAtTime(0.0001, endsAt)
            oscillator.connect(gain)
            gain.connect(masterGain)
            oscillator.start(startsAt)
            oscillator.stop(endsAt + 0.02)
        })

        return true
    }

    destroy() {
        this.musicAudio?.pause()
        this.onMusicEnded = null
        this.effectPools.forEach((pool) => {
            pool.forEach((audio) => audio.pause())
        })
        this.effectPools.clear()
        void this.synthAudioContext?.close?.()
        this.synthAudioContext = null
    }
}
