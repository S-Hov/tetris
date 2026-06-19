import { useCallback, useEffect, useMemo, useState } from 'react'

import AudioManager from '@/shared/lib/audio/AudioManager.js'

import AudioContext from './audioContext.js'

const AUDIO_SETTINGS_STORAGE_KEY = 'pvp-tetris-audio-settings'
const DEFAULT_SETTINGS = {
    effectsMuted: false,
    masterMuted: false,
    musicMuted: false,
    volume: 0.65,
}
const clampVolume = (value) => Math.min(Math.max(Number(value) || 0, 0), 1)

const loadAudioSettings = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_SETTINGS
    }

    try {
        const storedSettings = JSON.parse(window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY))

        return {
            ...DEFAULT_SETTINGS,
            ...storedSettings,
            volume: clampVolume(storedSettings?.volume ?? DEFAULT_SETTINGS.volume),
        }
    } catch {
        return DEFAULT_SETTINGS
    }
}

export const AudioProvider = ({ children }) => {
    const [audioManager] = useState(() => new AudioManager())
    const [settings, setSettings] = useState(loadAudioSettings)
    const [currentTrack, setCurrentTrack] = useState(null)
    const [isMusicPlaying, setIsMusicPlaying] = useState(false)
    const [playlist, setPlaylist] = useState([])
    const isMusicAudible = !settings.masterMuted && !settings.musicMuted

    useEffect(() => {
        window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    }, [settings])

    useEffect(() => {
        audioManager.setMusicSettings({
            muted: !isMusicAudible,
            volume: settings.volume,
        })
    }, [audioManager, isMusicAudible, settings.volume])

    useEffect(() => () => {
        audioManager.destroy()
    }, [audioManager])

    useEffect(() => {
        audioManager.setOnMusicEnded(() => {
            if (!playlist.length) {
                setIsMusicPlaying(false)
                return
            }

            const currentIndex = playlist.findIndex((track) => track.id === currentTrack?.id)
            const nextTrack = playlist[(currentIndex + 1 + playlist.length) % playlist.length]

            void audioManager.playTrack(nextTrack.src, {
                muted: !isMusicAudible,
                volume: settings.volume,
            }).then((didPlay) => {
                setCurrentTrack(nextTrack)
                setIsMusicPlaying(didPlay)
            })
        })

        return () => audioManager.setOnMusicEnded(null)
    }, [audioManager, currentTrack?.id, isMusicAudible, playlist, settings.volume])

    const playTrack = useCallback(async (track) => {
        if (!track?.src) {
            return false
        }

        const didPlay = await audioManager.playTrack(track.src, {
            muted: !isMusicAudible,
            volume: settings.volume,
        })

        if (didPlay) {
            setCurrentTrack(track)
            setIsMusicPlaying(true)
            return true
        }

        setIsMusicPlaying(false)
        return false
    }, [audioManager, isMusicAudible, settings.volume])

    const toggleMusicPlayback = useCallback(async () => {
        const isPlaying = await audioManager.toggleMusic()

        if (isPlaying === null) {
            return false
        }

        setIsMusicPlaying(isPlaying)
        return true
    }, [audioManager])

    const stopMusic = useCallback(() => {
        const didStop = audioManager.stopMusic()

        if (didStop) {
            setIsMusicPlaying(false)
        }

        return didStop
    }, [audioManager])

    const playAdjacentTrack = useCallback(async (direction) => {
        if (!playlist.length) {
            return false
        }

        const currentIndex = playlist.findIndex((track) => track.id === currentTrack?.id)
        const nextIndex = currentIndex === -1
            ? direction > 0 ? 0 : playlist.length - 1
            : (currentIndex + direction + playlist.length) % playlist.length

        return playTrack(playlist[nextIndex])
    }, [currentTrack?.id, playTrack, playlist])

    const playNextTrack = useCallback(
        () => playAdjacentTrack(1),
        [playAdjacentTrack]
    )

    const playPreviousTrack = useCallback(
        () => playAdjacentTrack(-1),
        [playAdjacentTrack]
    )

    const registerPlaylist = useCallback((tracks) => {
        setPlaylist(Array.isArray(tracks) ? tracks : [])
    }, [])

    const playEffect = useCallback((src, options = {}) => {
        if (!src || settings.masterMuted || settings.effectsMuted) {
            return false
        }

        return audioManager.playEffect(
            src,
            settings.volume * (options.volume ?? 1)
        )
    }, [audioManager, settings.effectsMuted, settings.masterMuted, settings.volume])

    const setVolume = useCallback((volume) => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            volume: clampVolume(volume),
        }))
    }, [])

    const toggleMusicMuted = useCallback(() => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            musicMuted: !currentSettings.musicMuted,
        }))
    }, [])

    const toggleEffectsMuted = useCallback(() => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            effectsMuted: !currentSettings.effectsMuted,
        }))
    }, [])

    const toggleMasterMuted = useCallback(() => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            masterMuted: !currentSettings.masterMuted,
        }))
    }, [])

    const value = useMemo(() => ({
        currentTrack,
        effectsMuted: settings.effectsMuted,
        isMusicPlaying,
        masterMuted: settings.masterMuted,
        musicMuted: settings.musicMuted,
        playEffect,
        playNextTrack,
        playPreviousTrack,
        playTrack,
        registerPlaylist,
        setVolume,
        stopMusic,
        toggleEffectsMuted,
        toggleMasterMuted,
        toggleMusicMuted,
        toggleMusicPlayback,
        volume: settings.volume,
    }), [
        currentTrack,
        isMusicPlaying,
        playEffect,
        playNextTrack,
        playPreviousTrack,
        playTrack,
        registerPlaylist,
        setVolume,
        stopMusic,
        settings.effectsMuted,
        settings.masterMuted,
        settings.musicMuted,
        settings.volume,
        toggleEffectsMuted,
        toggleMasterMuted,
        toggleMusicMuted,
        toggleMusicPlayback,
    ])

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    )
}
