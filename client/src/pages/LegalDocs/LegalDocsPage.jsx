import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, getLocalizedPath, SUPPORTED_LANGUAGES } from '@/i18n'

import { LEGAL_DOCUMENT_NAV, LEGAL_DOCUMENTS } from './legalDocs.content.js'

import './LegalDocsPage.css'

const LegalDocsPage = () => {
    const { documentSlug, lang } = useParams()
    const { t, i18n } = useTranslation()
    const currentLanguage = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE
    const legalDocument = LEGAL_DOCUMENTS[documentSlug]
    const content = legalDocument?.[currentLanguage] || legalDocument?.[DEFAULT_LANGUAGE]

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    useEffect(() => {
        if (content?.title) {
            document.title = `${content.title} | PVP Tetris`
        }
    }, [content?.title])

    if (!legalDocument) {
        return <Navigate to={getLocalizedPath('/docs/cookie', currentLanguage)} replace />
    }

    return (
        <section className="section legal-docs-page">
            <div className="container legal-docs-page__container">
                <aside className="legal-docs-page__nav" aria-label={t('legalDocs.navAriaLabel')}>
                    {LEGAL_DOCUMENT_NAV.map((item) => (
                        <Link
                            key={item.slug}
                            to={getLocalizedPath(`/docs/${item.slug}`, currentLanguage)}
                            className={item.slug === documentSlug ? 'is-active' : ''}
                        >
                            {t(item.labelKey)}
                        </Link>
                    ))}
                </aside>

                <article className="legal-docs-page__document">
                    <p className="legal-docs-page__eyebrow">{t('legalDocs.eyebrow')}</p>
                    <h1>{content.title}</h1>
                    <p className="legal-docs-page__updated">
                        {t('legalDocs.updatedAt', { date: legalDocument.updatedAt })}
                    </p>
                    <p className="legal-docs-page__lead">{content.lead}</p>

                    {/* <div className="legal-docs-page__notice">
                        {t('legalDocs.notice')}
                    </div> */}

                    <div className="legal-docs-page__sections">
                        {content.sections.map((section) => (
                            <section key={section.title} className="legal-docs-page__section">
                                <h2>{section.title}</h2>
                                {section.paragraphs.map((paragraph) => (
                                    <p key={paragraph}>{paragraph}</p>
                                ))}
                            </section>
                        ))}
                    </div>
                </article>
            </div>
        </section>
    )
}

export default LegalDocsPage
