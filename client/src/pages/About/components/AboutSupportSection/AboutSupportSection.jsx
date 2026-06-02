import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'

import CustomSelect from '@/shared/ui/CustomSelect'
import GlowEffect from '@/shared/ui/GlowEffect'
import TurnstileWidget from '@/shared/ui/TurnstileWidget'
import { supportAPI } from '@/shared/api/support'
import { useAuth } from '@/shared/hooks/useAuth'
import notify from '@/utils/Notifications'

import gameDevImage from './assets/game_dev.png'

import './AboutSupportSection.css'

const AboutSupportSection = ({ currentLanguage }) => {
    const { t } = useTranslation()
    const { isAuth, user } = useAuth()
    const [donationWallets, setDonationWallets] = useState([])
    const [selectedWalletId, setSelectedWalletId] = useState('')
    const [isAnonymousDonation, setIsAnonymousDonation] = useState(false)
    const [isQrOpen, setIsQrOpen] = useState(false)
    const [isWalletsLoading, setIsWalletsLoading] = useState(true)
    const [isDonationSubmitting, setIsDonationSubmitting] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState('')
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
    const selectedWallet = donationWallets.find((wallet) => String(wallet.id) === String(selectedWalletId)) || donationWallets[0]
    const cryptoOptions = donationWallets.map((wallet) => ({
        value: String(wallet.id),
        label: wallet.addressLabel || `${wallet.currencyCode} ${t('about.donate.inNetwork')} ${wallet.networkName}`,
        description: `${wallet.currencyName || wallet.currencyCode} | ${wallet.networkName}`,
        iconImage: wallet.currencyIconUrl || wallet.networkIconUrl,
        iconText: wallet.currencyIconSymbol || wallet.networkIconSymbol || wallet.currencyCode?.slice(0, 2),
    }))

    useEffect(() => {
        let ignore = false

        const loadWallets = async () => {
            setIsWalletsLoading(true)

            try {
                const response = await supportAPI.getDonationWallets()
                const wallets = Array.isArray(response.wallets) ? response.wallets : []

                if (!ignore) {
                    setDonationWallets(wallets)
                    setSelectedWalletId(wallets[0] ? String(wallets[0].id) : '')
                }
            } catch (error) {
                if (!ignore) {
                    notify(error.message || t('about.donate.errors.walletsLoad'), 'error')
                }
            } finally {
                if (!ignore) {
                    setIsWalletsLoading(false)
                }
            }
        }

        loadWallets()

        return () => {
            ignore = true
        }
    }, [t])

    const handleTurnstileTokenChange = useCallback((token) => {
        setTurnstileToken(token)
    }, [])

    const resetTurnstile = () => {
        setTurnstileToken('')
        setTurnstileResetSignal((value) => value + 1)
    }

    const handleDonateSubmit = async (event) => {
        event.preventDefault()

        if (!selectedWallet) {
            notify(t('about.donate.errors.noWallet'), 'error')
            return
        }

        if (!turnstileToken) {
            notify(t('about.donate.errors.turnstile'), 'error')
            return
        }

        const form = event.currentTarget
        const formData = new FormData(form)

        setIsDonationSubmitting(true)

        try {
            await supportAPI.createDonation({
                walletId: selectedWallet.id,
                isAnonymous: !isAuth || isAnonymousDonation,
                expectedAmount: formData.get('expectedAmount'),
                donorName: formData.get('donorName') || (isAuth && !isAnonymousDonation ? user?.username : ''),
                note: formData.get('note'),
                turnstileToken,
            })

            form.reset()
            notify(t('about.donate.success.created'), 'success')
        } catch (error) {
            notify(error.message || t('about.donate.errors.create'), 'error')
            resetTurnstile()
        } finally {
            setIsDonationSubmitting(false)
        }
    }

    const handleCopyAddress = async () => {
        if (!selectedWallet?.address) {
            notify(t('about.donate.errors.noAddress'), 'error')
            return
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(selectedWallet.address)
            } else {
                const input = document.createElement('input')
                input.value = selectedWallet.address
                input.setAttribute('readonly', 'readonly')
                input.style.position = 'fixed'
                input.style.opacity = '0'
                document.body.appendChild(input)
                input.select()
                document.execCommand('copy')
                document.body.removeChild(input)
            }

            notify(t('about.donate.success.copied'), 'success')
        } catch {
            notify(t('about.donate.errors.copy'), 'error')
        }
    }

    return (
        <>
            <section className="about-support-grid" id="donate">
                <article className="about-dev-card">
                    <img src={gameDevImage} alt="" />
                    <div className="about-dev-card__content">
                        <p className="about-kicker">{t('about.dev.kicker')}</p>
                        <h2>{t('about.dev.title')}</h2>
                        <p>{t('about.dev.description')}</p>
                        <Link className="button about-button about-button--primary" to={`/${currentLanguage}/support`}>
                            {t('about.dev.button')}
                        </Link>
                    </div>
                </article>

                <section className="about-donate-card">
                    <GlowEffect className="about-donate-card-glow">
                        <div className="glow-effect about-donate-content">
                            <form className="about-donate-form" onSubmit={handleDonateSubmit}>
                                <div className="about-donate-form__head">
                                    <p className="about-kicker">{t('about.donate.kicker')}</p>
                                    <p>{t('about.donate.description')}</p>
                                </div>

                                <label className="about-field">
                                    <span>{t('about.donate.currency')}</span>
                                    <CustomSelect
                                        name="walletId"
                                        value={selectedWalletId}
                                        options={cryptoOptions}
                                        onChange={setSelectedWalletId}
                                        disabled={isWalletsLoading || cryptoOptions.length === 0}
                                        placeholder={isWalletsLoading ? t('about.donate.loadingWallets') : t('about.donate.emptyWallets')}
                                    />
                                </label>

                                <label className="about-field">
                                    <span>{t('about.donate.amount')}</span>
                                    <input name="expectedAmount" type="number" min="0.000000000000000001" step="any" placeholder={t('about.donate.amountPlaceholder')} required />
                                </label>

                                {isAuth ? (
                                    <label className="about-field about-field--check">
                                        <input
                                            checked={isAnonymousDonation}
                                            type="checkbox"
                                            onChange={(event) => setIsAnonymousDonation(event.target.checked)}
                                        />
                                        <span>{t('about.donate.anonymous')}</span>
                                    </label>
                                ) : null}

                                {(!isAuth || isAnonymousDonation) ? (
                                    <label className="about-field">
                                        <span>{t('about.donate.nickname')}</span>
                                        <input name="donorName" type="text" maxLength="120" placeholder="NeonStack" required />
                                    </label>
                                ) : (
                                    <label className="about-field">
                                        <span>{t('about.donate.from')}</span>
                                        <input type="text" value={user?.username || t('about.donate.accountFallback')} readOnly />
                                    </label>
                                )}

                                <label className="about-field about-field--wide">
                                    <span>{t('about.donate.wallet')}</span>
                                    <div className="about-wallet-row">
                                        <input type="text" value={selectedWallet?.address || ''} readOnly />
                                        <button
                                            aria-label={t('about.donate.copyAddress')}
                                            disabled={!selectedWallet?.address}
                                            type="button"
                                            onClick={handleCopyAddress}
                                        >
                                            <i className="fas fa-copy"></i>
                                        </button>
                                        <button
                                            aria-label={t('about.donate.showQr')}
                                            disabled={!selectedWallet?.address}
                                            type="button"
                                            onClick={() => setIsQrOpen(true)}
                                        >
                                            <i className="fas fa-qrcode"></i>
                                        </button>
                                    </div>
                                    {selectedWallet?.memoTag && <small>Memo/tag: {selectedWallet.memoTag}</small>}
                                    {selectedWallet?.memoRequired && !selectedWallet?.memoTag && (
                                        <small>{t('about.donate.memoRequired')}</small>
                                    )}
                                </label>

                                <label className="about-field about-field--wide">
                                    <span>{t('about.donate.comment')}</span>
                                    <textarea name="note" rows="3" placeholder={t('about.donate.commentPlaceholder')}></textarea>
                                </label>

                                <TurnstileWidget onTokenChange={handleTurnstileTokenChange} resetSignal={turnstileResetSignal} />

                                <button type="submit" className="button about-button about-button--primary" disabled={isDonationSubmitting || !selectedWallet || !turnstileToken}>
                                    <i className="fas fa-wallet"></i>
                                    {isDonationSubmitting ? t('about.donate.submitting') : t('about.donate.submit')}
                                </button>
                            </form>
                        </div>
                    </GlowEffect>
                </section>
            </section>

            {isQrOpen && selectedWallet?.address ? (
                <div className="about-qr-modal" role="presentation" onMouseDown={() => setIsQrOpen(false)}>
                    <section
                        className="about-qr-modal__dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('about.donate.qrDialog')}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <button
                            className="about-qr-modal__close"
                            aria-label={t('about.donate.closeQr')}
                            type="button"
                            onClick={() => setIsQrOpen(false)}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <div className="about-qr-modal__code">
                            <QRCodeSVG
                                value={selectedWallet.address}
                                size={224}
                                bgColor="#ffffff"
                                fgColor="#07111f"
                                level="M"
                                includeMargin
                            />
                        </div>
                        <strong>{selectedWallet.currencyCode} / {selectedWallet.networkName}</strong>
                        <code>{selectedWallet.address}</code>
                        {selectedWallet.memoTag && <small>Memo/tag: {selectedWallet.memoTag}</small>}
                    </section>
                </div>
            ) : null}
        </>
    )
}

export default AboutSupportSection
