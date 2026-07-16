const EMAIL_APP_NAME = process.env.APP_NAME || 'PVP Blocks'

export const createEmailLayout = ({
    title,
    eyebrow,
    intro,
    bodyHtml,
    footerNote,
    preheader = '',
}) => `
    <!DOCTYPE html>
    <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHtml(title)}</title>
        </head>
        <body style="margin:0;padding:0;background:#f4f6fa;font-family:Arial,Helvetica,sans-serif;color:#203040;">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
            <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f6fa" style="background:#f4f6fa;">
                <tr>
                    <td align="center" style="padding:40px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;box-shadow:0 8px 30px rgba(0,0,0,0.06);overflow:hidden;">
                            <tr>
                                <td style="padding:40px 36px;">
                                    <p style="margin:0 0 12px;color:#6c7a89;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                                    <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#1a2a3a;">${escapeHtml(title)}</h1>
                                    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#516272;">${escapeHtml(intro)}</p>
                                    ${bodyHtml}
                                    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e4ebf2;">
                                        <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#7a8a99;">${escapeHtml(footerNote)}</p>
                                        <p style="margin:0;font-size:11px;line-height:1.6;color:#9aa7b3;">${escapeHtml(EMAIL_APP_NAME)}</p>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
    </html>
`

export const createVerificationEmailTemplate = (code) => createEmailLayout({
    title: 'Подтверждение почты',
    eyebrow: 'PVP Blocks',
    intro: 'Для завершения действия используйте код подтверждения ниже.',
    preheader: `Код подтверждения: ${code}`,
    footerNote: 'Если вы не запрашивали этот код, просто проигнорируйте письмо.',
    bodyHtml: `
        <div style="margin:0 0 24px;padding:20px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;text-align:center;">
            <span style="font-family:Menlo,Monaco,Consolas,monospace;font-size:40px;font-weight:700;letter-spacing:8px;color:#1a3a4a;">${escapeHtml(code)}</span>
        </div>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6c7a89;">Код действует 3 минуты.</p>
    `,
})

export const createRegistrationVerificationEmailTemplate = (code) => createEmailLayout({
    title: 'Регистрация почти завершена',
    eyebrow: 'PVP Blocks',
    intro: 'Спасибо за регистрацию в PVP Blocks. Аккаунт успешно создан, осталось подтвердить почту кодом ниже.',
    preheader: `Код подтверждения регистрации: ${code}`,
    footerNote: 'Если вы не регистрировались в PVP Blocks, просто проигнорируйте это письмо.',
    bodyHtml: `
        <div style="margin:0 0 24px;padding:20px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;text-align:center;">
            <span style="font-family:Menlo,Monaco,Consolas,monospace;font-size:40px;font-weight:700;letter-spacing:8px;color:#1a3a4a;">${escapeHtml(code)}</span>
        </div>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6c7a89;">Код действует 3 минуты.</p>
    `,
})

export const createSupportRequestReceivedEmailTemplate = ({
    ticketId,
    contactName,
    preferredChannel,
    title,
}) => {
    const isTelegram = preferredChannel === 'telegram'
    const channelText = isTelegram
        ? 'Мы получили ваше обращение. Вы выбрали Telegram, поэтому вся дальнейшая переписка по заявке будет идти там.'
        : 'Мы получили ваше обращение. Ответ поддержки придет на эту почту.'

    return createEmailLayout({
        title: `Обращение #${ticketId} получено`,
        eyebrow: 'Поддержка PVP Blocks',
        intro: `${contactName || 'Здравствуйте'}! Спасибо, что написали нам. ${channelText}`,
        preheader: `Мы получили обращение #${ticketId}`,
        footerNote: isTelegram
            ? 'Пожалуйста, откройте Telegram по ссылке с сайта и нажмите Start, если еще не сделали этого.'
            : 'Пожалуйста, не удаляйте это письмо: номер обращения поможет быстрее найти вашу заявку.',
        bodyHtml: `
            <div style="margin:0 0 16px;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6c7a89;">Номер обращения: #${escapeHtml(ticketId)}</p>
                ${title ? `<p style="margin:0;font-size:13px;line-height:1.6;color:#6c7a89;">Тема: ${escapeHtml(title)}</p>` : ''}
            </div>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#203040;">Мы уже передали заявку команде поддержки и ответим как можно скорее.</p>
        `,
    })
}

export const createTemporaryPasswordEmailTemplate = (password) => createEmailLayout({
    title: 'Новый временный пароль',
    eyebrow: 'PVP Blocks',
    intro: 'Мы создали новый временный пароль для вашего аккаунта. После входа обязательно смените его в профиле.',
    preheader: 'Новый временный пароль для входа в PVP Blocks',
    footerNote: 'Если вы не запрашивали восстановление доступа, войдите в аккаунт и смените пароль.',
    bodyHtml: `
        <div style="margin:0 0 24px;padding:20px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;text-align:center;">
            <span style="font-family:Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:2px;color:#1a3a4a;">${escapeHtml(password)}</span>
        </div>
    `,
})

export const createSupportReplyEmailTemplate = ({
    ticketId,
    contactName,
    replyText,
}) => createEmailLayout({
    title: `Ответ по обращению #${ticketId}`,
    eyebrow: 'Поддержка PVP Blocks',
    intro: `${contactName || 'Здравствуйте'}! Мы получили ваше обращение и отправляем ответ поддержки ниже.`,
    preheader: `Ответ поддержки по обращению #${ticketId}`,
    footerNote: 'Вы можете ответить прямо на это письмо, и сообщение попадёт в поддержку.',
    bodyHtml: `
        <div style="margin:0 0 16px;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#6c7a89;">Номер обращения: #${escapeHtml(ticketId)}</p>
        </div>
        <div style="padding:20px 24px;background:#ffffff;border:1px solid #d9e3ee;border-radius:18px;">
            ${formatMultilineParagraphs(replyText)}
        </div>
    `,
})

const formatMultilineParagraphs = (value) => {
    const text = String(value || '').trim()

    if (!text) {
        return '<p style="margin:0;font-size:15px;line-height:1.7;color:#203040;">Сообщение отсутствует.</p>'
    }

    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#203040;">${escapeHtml(line)}</p>`)
        .join('')
}

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
