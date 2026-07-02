import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { donationBenefitsMeta, donationHeart, donationBackground } from './homeDonation.data.js'

import './SupportProjectSection.css'

const SupportProjectSection = ({ currentLanguage }) => {
    const { t } = useTranslation()
    const donationBenefits = donationBenefitsMeta.map((benefit) => ({
        ...benefit,
        title: t(`home.donation.benefits.${benefit.key}.title`),
        description: t(`home.donation.benefits.${benefit.key}.description`),
    }))

    return (
        <section className="home-donation" style={{ '--donation-bg': `url(${donationBackground})` }} aria-labelledby="home-donation-title">
            <div className="home-donation__content">
                <div className="home-donation__heading">
                    <div className="home-donation__content-header">
                        <img className="home-donation__heart" src={donationHeart} alt="" />
                        <h2 id="home-donation-title">
                            <span>{t('home.donation.titlePrefix')}</span>
                            <strong className="glow-text">{t('home.donation.titleHighlight')}</strong>
                        </h2>
                    </div>
                    <p>{t('home.donation.description')}</p>
                </div>

                <div className="home-donation__benefits">
                    {donationBenefits.map((benefit) => (
                        <article className="home-donation-benefit" key={benefit.key}>
                            <img src={benefit.icon} alt="" />
                            <h3>{benefit.title}</h3>
                            <p>{benefit.description}</p>
                        </article>
                    ))}
                </div>

                <Link to={`/${currentLanguage}/about#donate`} className="home-donation__button">
                    <i className="fas fa-heart"></i>
                    {t('home.donation.button')}
                </Link>

                <p className="home-donation__note">
                    {t('home.donation.note')}
                </p>
            </div>
        </section>
    )
}

export default SupportProjectSection
