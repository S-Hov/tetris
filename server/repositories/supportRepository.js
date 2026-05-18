import { pool } from '../db/index.js'

export const createSupportRequestRepo = async ({
    userId,
    category,
    contactName,
    contactEmail,
    preferredChannel,
    telegramToken,
    telegramUrl,
    title,
    message,
    pageUrl,
    attachmentUrl,
    clientContext,
}) => {
    const result = await pool.query(
        `
        INSERT INTO support_requests (
            user_id,
            category,
            contact_name,
            contact_email,
            preferred_channel,
            telegram_token,
            telegram_url,
            title,
            message,
            page_url,
            attachment_url,
            client_context
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
        RETURNING id, category, status, priority, preferred_channel, telegram_url, title, created_at
        `,
        [
            userId || null,
            category,
            contactName || null,
            contactEmail || null,
            preferredChannel,
            telegramToken || null,
            telegramUrl || null,
            title || null,
            message,
            pageUrl || null,
            attachmentUrl || null,
            JSON.stringify(clientContext || {}),
        ]
    )

    return result.rows[0]
}

export const getSupportUserContextRepo = async (userId) => {
    if (!userId) {
        return null
    }

    const result = await pool.query(
        `
        SELECT id, username, email, status
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
    )

    return result.rows[0] || null
}

export const getActiveSupportBlockRepo = async (userId) => {
    if (!userId) {
        return null
    }

    const result = await pool.query(
        `
        SELECT id, user_id, reason, blocked_until, created_at
        FROM support_user_blocks
        WHERE user_id = $1
            AND status = 'active'
            AND (blocked_until IS NULL OR blocked_until > NOW())
        LIMIT 1
        `,
        [userId]
    )

    return result.rows[0] || null
}

export const getSupportRequestByIdRepo = async (ticketId) => {
    const result = await pool.query(
        `
        SELECT
            id,
            user_id,
            category,
            status,
            priority,
            preferred_channel,
            contact_name,
            contact_email,
            title,
            message,
            telegram_token,
            telegram_url,
            admin_notes,
            resolved_at,
            created_at,
            updated_at
        FROM support_requests
        WHERE id = $1
        LIMIT 1
        `,
        [ticketId]
    )

    return result.rows[0] || null
}

export const appendSupportAdminReplyRepo = async ({
    ticketId,
    adminTelegramId,
    replyText,
}) => {
    const result = await pool.query(
        `
        UPDATE support_requests
        SET
            admin_notes = CONCAT_WS(
                E'\n\n',
                NULLIF(admin_notes, ''),
                CONCAT(
                    '[',
                    TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS'),
                    '] Telegram admin ',
                    $2,
                    ': ',
                    $3
                )
            ),
            status = CASE
                WHEN status IN ('new', 'triaged') THEN 'in_progress'
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, status, admin_notes, updated_at
        `,
        [ticketId, adminTelegramId, replyText]
    )

    return result.rows[0] || null
}

export const getActiveDonationWalletsRepo = async () => {
    const result = await pool.query(
        `
        SELECT
            donation_wallets.id,
            donation_wallets.currency_code,
            donation_wallets.network_key,
            donation_wallets.network_name,
            donation_wallets.address,
            donation_wallets.address_label,
            donation_wallets.memo_tag,
            donation_wallets.metadata,
            donation_currencies.name AS currency_name,
            donation_currencies.icon_url AS currency_icon_url,
            donation_currencies.icon_symbol AS currency_icon_symbol,
            donation_networks.icon_url AS network_icon_url,
            donation_networks.icon_symbol AS network_icon_symbol,
            donation_currency_networks.memo_required
        FROM donation_wallets
        LEFT JOIN donation_currency_networks ON donation_currency_networks.id = donation_wallets.currency_network_id
        LEFT JOIN donation_currencies ON donation_currencies.code = donation_wallets.currency_code
        LEFT JOIN donation_networks ON donation_networks.key = donation_wallets.network_key
        WHERE donation_wallets.status = 'active'
            AND COALESCE(donation_currencies.status, 'active') = 'active'
            AND COALESCE(donation_networks.status, 'active') = 'active'
            AND COALESCE(donation_currency_networks.status, 'active') = 'active'
            AND COALESCE(donation_currency_networks.deposit_enabled, TRUE) = TRUE
        ORDER BY donation_wallets.sort_order ASC, donation_wallets.currency_code ASC, donation_wallets.network_name ASC, donation_wallets.id ASC
        `
    )

    return result.rows
}

export const getDonationWalletByIdRepo = async (id) => {
    const result = await pool.query(
        `
        SELECT donation_wallets.id, donation_wallets.currency_code, donation_wallets.network_key, donation_wallets.network_name, donation_wallets.address, donation_wallets.address_label, donation_wallets.memo_tag
        FROM donation_wallets
        LEFT JOIN donation_currency_networks ON donation_currency_networks.id = donation_wallets.currency_network_id
        LEFT JOIN donation_currencies ON donation_currencies.code = donation_wallets.currency_code
        LEFT JOIN donation_networks ON donation_networks.key = donation_wallets.network_key
        WHERE donation_wallets.id = $1
            AND donation_wallets.status = 'active'
            AND COALESCE(donation_currencies.status, 'active') = 'active'
            AND COALESCE(donation_networks.status, 'active') = 'active'
            AND COALESCE(donation_currency_networks.status, 'active') = 'active'
            AND COALESCE(donation_currency_networks.deposit_enabled, TRUE) = TRUE
        `,
        [id]
    )

    return result.rows[0]
}

export const createDonationRepo = async ({
    userId,
    wallet,
    donorName,
    donorContact,
    expectedAmount,
    note,
}) => {
    const result = await pool.query(
        `
        INSERT INTO donations (
            user_id,
            wallet_id,
            donor_name,
            donor_contact,
            currency_code,
            network_key,
            expected_amount,
            status,
            note,
            expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'waiting_payment', $8, NOW() + INTERVAL '7 days')
        RETURNING id, status, currency_code, network_key, expected_amount, expires_at, created_at
        `,
        [
            userId || null,
            wallet.id,
            donorName || null,
            donorContact || null,
            wallet.currency_code,
            wallet.network_key,
            expectedAmount || null,
            note || null,
        ]
    )

    return result.rows[0]
}

export const createDonationEventRepo = async ({ donationId, eventType, statusTo, payload }) => {
    const result = await pool.query(
        `
        INSERT INTO donation_verification_events (
            donation_id,
            event_type,
            status_to,
            verification_source,
            payload
        )
        VALUES ($1, $2, $3, 'site_form', $4::jsonb)
        RETURNING id, event_type, created_at
        `,
        [
            donationId,
            eventType,
            statusTo || null,
            JSON.stringify(payload || {}),
        ]
    )

    return result.rows[0]
}
