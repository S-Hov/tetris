import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import useAudio from '@/shared/hooks/useAudio.js'

import { audioTracks } from './audioTracks.js'
import './AudioControl.css'

const TRACK_POSITIONS = [
    { x: -299, y: -164, mobileX: -286, mobileY: -150 },
    { x: -223, y: -210, mobileX: -212, mobileY: -190 },
    { x: -147, y: -210, mobileX: -138, mobileY: -190 },
    { x: -71, y: -164, mobileX: -64, mobileY: -150 },
]

const AudioControl = ({ hideTrigger = false, openSignal = 0 } = {}) => {
    const { t } = useTranslation()
    const controlRef = useRef(null)
    const previousOpenSignalRef = useRef(openSignal)
    const [isOpen, setIsOpen] = useState(false)
    const {
        currentTrack,
        effectsMuted,
        isMusicPlaying,
        masterMuted,
        musicMuted,
        playTrack,
        playNextTrack,
        playPreviousTrack,
        registerPlaylist,
        setVolume,
        toggleEffectsMuted,
        toggleMasterMuted,
        toggleMusicMuted,
        toggleMusicPlayback,
        volume,
    } = useAudio()

    useEffect(() => {
        registerPlaylist(audioTracks)

        return () => registerPlaylist([])
    }, [registerPlaylist])

    useEffect(() => {
        if (previousOpenSignalRef.current === openSignal) {
            return undefined
        }

        previousOpenSignalRef.current = openSignal
        let isCancelled = false

        queueMicrotask(() => {
            if (!isCancelled) {
                setIsOpen(true)
            }
        })

        return () => {
            isCancelled = true
        }
    }, [openSignal])

    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        const handlePointerDown = (event) => {
            if (!controlRef.current?.contains(event.target)) {
                setIsOpen(false)
            }
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    const handleTrackSelect = (track) => {
        if (currentTrack?.id === track.id && isMusicPlaying) {
            void toggleMusicPlayback()
            return
        }

        void playTrack(track)
    }

    const handlePlaybackToggle = () => {
        if (currentTrack) {
            void toggleMusicPlayback()
            return
        }

        void playTrack(audioTracks[0])
    }

    return (
        <aside
            ref={controlRef}
            className={`audio-control ${isOpen ? 'audio-control--open' : ''}`}
            aria-label={t('audioControl.ariaLabel')}
        >
            <div className="audio-control__tracks" aria-hidden={!isOpen}>
                {audioTracks.map((track, index) => {
                    const isActive = currentTrack?.id === track.id
                    const position = TRACK_POSITIONS[index]

                    return (
                        <button
                            key={track.id}
                            type="button"
                            className={`audio-control__track ${isActive ? 'is-active' : ''}`}
                            style={{
                                '--track-x': `${position.x}px`,
                                '--track-y': `${position.y}px`,
                                '--track-mobile-x': `${position.mobileX}px`,
                                '--track-mobile-y': `${position.mobileY}px`,
                            }}
                            aria-label={t('audioControl.playTrack', { track: track.label })}
                            aria-pressed={isActive && isMusicPlaying}
                            tabIndex={isOpen ? 0 : -1}
                            title={track.label}
                            onClick={() => handleTrackSelect(track)}
                        >
                            <span>{index + 1}</span>
                            <i className={isActive && isMusicPlaying ? 'fas fa-pause' : 'fas fa-music'}></i>
                        </button>
                    )
                })}
            </div>

            <div className="audio-control__transport" aria-hidden={!isOpen}>
                <TransportButton
                    icon="fas fa-backward-step"
                    label={t('audioControl.previous')}
                    onClick={() => void playPreviousTrack()}
                    tabIndex={isOpen ? 0 : -1}
                />
                <TransportButton
                    icon={isMusicPlaying ? 'fas fa-pause' : 'fas fa-play'}
                    label={isMusicPlaying ? t('audioControl.pause') : t('audioControl.play')}
                    onClick={handlePlaybackToggle}
                    tabIndex={isOpen ? 0 : -1}
                />
                <TransportButton
                    icon="fas fa-forward-step"
                    label={t('audioControl.next')}
                    onClick={() => void playNextTrack()}
                    tabIndex={isOpen ? 0 : -1}
                />
            </div>

            <div className="audio-control__panel" aria-hidden={!isOpen}>
                <div className="audio-control__now-playing">
                    <span>
                        <small>{t('audioControl.nowPlaying')}</small>
                        <strong>{currentTrack?.label || t('audioControl.noTrack')}</strong>
                    </span>
                    <button
                        type="button"
                        aria-label={isMusicPlaying ? t('audioControl.pause') : t('audioControl.play')}
                        tabIndex={isOpen ? 0 : -1}
                        title={isMusicPlaying ? t('audioControl.pause') : t('audioControl.play')}
                        onClick={handlePlaybackToggle}
                    >
                        <i className={isMusicPlaying ? 'fas fa-pause' : 'fas fa-play'}></i>
                    </button>
                </div>

                <label className="audio-control__volume">
                    <i className="fas fa-volume-low"></i>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        aria-label={t('audioControl.volume')}
                        tabIndex={isOpen ? 0 : -1}
                        onChange={(event) => setVolume(event.target.value)}
                    />
                    <strong>{Math.round(volume * 100)}%</strong>
                </label>
            </div>

            <div className="audio-control__channel-actions" aria-hidden={!isOpen}>
                <MuteButton
                    active={musicMuted}
                    className="audio-control__music-mute"
                    icon="fas fa-music"
                    label={t('audioControl.toggleMusic')}
                    onClick={toggleMusicMuted}
                    tabIndex={isOpen ? 0 : -1}
                />
                <MuteButton
                    active={effectsMuted}
                    icon={effectsMuted ? 'fas fa-bell-slash' : 'fas fa-bell'}
                    label={t('audioControl.toggleEffects')}
                    onClick={toggleEffectsMuted}
                    tabIndex={isOpen ? 0 : -1}
                />
                <MuteButton
                    active={masterMuted}
                    icon={masterMuted ? 'fas fa-volume-xmark' : 'fas fa-volume-high'}
                    label={t('audioControl.toggleAll')}
                    onClick={toggleMasterMuted}
                    tabIndex={isOpen ? 0 : -1}
                />
            </div>

            <button
                type="button"
                className={`audio-control__trigger ${hideTrigger ? 'audio-control__trigger--hidden' : ''}`}
                aria-expanded={isOpen}
                aria-label={isOpen ? t('audioControl.close') : t('audioControl.open')}
                aria-hidden={hideTrigger}
                title={isOpen ? t('audioControl.close') : t('audioControl.open')}
                tabIndex={hideTrigger ? -1 : 0}
                onClick={() => setIsOpen((currentValue) => !currentValue)}
            >
                <span className="audio-control__pulse"></span>
                <i className={masterMuted ? 'fas fa-volume-xmark' : 'fas fa-music'}></i>
            </button>
        </aside>
    )
}

const MuteButton = ({ active, className = '', icon, label, onClick, tabIndex }) => (
    <button
        type="button"
        className={`${className} ${active ? 'is-active' : ''}`.trim()}
        aria-label={label}
        aria-pressed={active}
        tabIndex={tabIndex}
        title={label}
        onClick={onClick}
    >
        <i className={icon}></i>
    </button>
)

const TransportButton = ({ icon, label, onClick, tabIndex }) => (
    <button
        type="button"
        aria-label={label}
        tabIndex={tabIndex}
        title={label}
        onClick={onClick}
    >
        <i className={icon}></i>
    </button>
)

export default AudioControl
