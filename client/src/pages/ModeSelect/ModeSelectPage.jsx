import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import notify from '@/utils/Notifications'
import {
    defaultModeSettings,
    getModeSelectionConfig,
    MATCH_PLAY_OPTIONS,
    playOptionCards,
} from '@/shared/config/gameModes.js'
import './ModeSelectPage.css'

const ModeSelectPage = () => {
    const navigate = useNavigate()
    const { mode } = useParams()
    const modeConfig = useMemo(() => getModeSelectionConfig(mode), [mode])
    const [settings, setSettings] = useState(defaultModeSettings)
    const [selectedPlayType, setSelectedPlayType] = useState(MATCH_PLAY_OPTIONS.ROOM)

    const roomActionEnabled = modeConfig.roomSupported

    const handleToggle = (key) => {
        setSettings((currentValue) => ({
            ...currentValue,
            [key]: !currentValue[key],
        }))
    }

    const handlePlayType = (playType) => {
        setSelectedPlayType(playType)

        if (playType === MATCH_PLAY_OPTIONS.ROOM) {
            if (!roomActionEnabled) {
                notify('Комнаты для этого режима пока в разработке', 'info')
                return
            }

            navigate(`/game/${modeConfig.key}/lobby`, {
                state: {
                    modeKey: modeConfig.key,
                    modeTitle: modeConfig.title,
                    modeIcon: modeConfig.icon,
                    roomSettings: settings,
                },
            })
            return
        }

        notify('Этот сценарий пока открыт как макет для будущего развития режима', 'info')
    }

    return (
        <section className="section mode-select-page">
            <div className="container mode-select-container">
                <section className="mode-select-banner">
                    <GlowEffect>
                        <div className="glow-effect mode-select-banner__content">
                            <div>
                                <p className="mode-select-eyebrow">{modeConfig.heroLabel}</p>
                                <h1>
                                    <i className={modeConfig.icon}></i>
                                    {modeConfig.title}
                                </h1>
                                <p>{modeConfig.subtitle}</p>
                            </div>

                            <div className="mode-select-online-badge">
                                <i className="fas fa-globe"></i>
                                {modeConfig.online}
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="mode-select-options">
                    {playOptionCards.map((option) => {
                        const isSelected = selectedPlayType === option.key
                        const isDisabled = option.key === MATCH_PLAY_OPTIONS.ROOM && !roomActionEnabled
                        const metaItems = modeConfig.cardMeta[option.key] || []

                        return (
                            <button
                                key={option.key}
                                type="button"
                                className={`mode-option-card ${isSelected ? 'mode-option-card--active' : ''}`}
                                onClick={() => handlePlayType(option.key)}
                            >
                                <GlowEffect>
                                    <div className="glow-effect mode-option-card__inner">
                                        <div className="mode-option-icon">
                                            <i className={option.icon}></i>
                                        </div>

                                        <h2>{option.emoji} {option.title}</h2>
                                        <p>{option.description}</p>

                                        <div className="mode-option-meta">
                                            {metaItems.map((item) => (
                                                <span key={item}>{item}</span>
                                            ))}
                                        </div>

                                        <div className="mode-option-footer">
                                            <span className={`mode-option-state ${isDisabled ? 'mode-option-state--disabled' : ''}`}>
                                                {isDisabled ? 'Скоро будет' : option.key === MATCH_PLAY_OPTIONS.ROOM ? 'Открыть лобби' : 'Доступно как макет'}
                                            </span>
                                        </div>
                                    </div>
                                </GlowEffect>
                            </button>
                        )
                    })}
                </section>

                <section className="mode-select-settings">
                    <GlowEffect>
                        <div className="glow-effect mode-select-settings__content">
                            <div className="profile-section-title">
                                <i className="fas fa-sliders-h"></i>
                                Настройки матча
                            </div>

                            <div className="mode-settings-grid">
                                <SettingToggle
                                    title="Способности"
                                    description="Энергия, дебаффы и выбор эффектов во время матча."
                                    checked={settings.abilitiesEnabled}
                                    onToggle={() => handleToggle('abilitiesEnabled')}
                                />

                                <SettingToggle
                                    title="Нестандартные блоки"
                                    description="В пул фигур добавляются специальные нестандартные формы."
                                    checked={settings.specialBlocksEnabled}
                                    onToggle={() => handleToggle('specialBlocksEnabled')}
                                />
                            </div>

                            <div className="mode-select-summary">
                                <div>
                                    <span>Текущая конфигурация</span>
                                    <strong>{modeConfig.title}</strong>
                                </div>
                                <div className="mode-select-pills">
                                    <span className={`mode-select-pill ${settings.abilitiesEnabled ? 'is-active' : ''}`}>
                                        {settings.abilitiesEnabled ? 'С эффектами' : 'Без эффектов'}
                                    </span>
                                    <span className={`mode-select-pill ${settings.specialBlocksEnabled ? 'is-active' : ''}`}>
                                        {settings.specialBlocksEnabled ? 'Нестандартные блоки вкл.' : 'Стандартные блоки'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </GlowEffect>
                </section>
            </div>
        </section>
    )
}

const SettingToggle = ({ title, description, checked, onToggle }) => (
    <button type="button" className="mode-setting-row" onClick={onToggle}>
        <span>
            <strong>{title}</strong>
            <small>{description}</small>
        </span>
        <span className={`mode-toggle ${checked ? 'mode-toggle--active' : ''}`}>
            <span></span>
        </span>
    </button>
)

export default ModeSelectPage
