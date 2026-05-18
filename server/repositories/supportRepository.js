import { pool } from '../db/index.js'

export const createSupportRequestRepo = async ({
    userId,
    category,
    contactName,
    contactEmail,
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
            title,
            message,
            page_url,
            attachment_url,
            client_context
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING id, category, status, priority, title, created_at
        `,
        [
            userId || null,
            category,
            contactName || null,
            contactEmail || null,
            title || null,
            message,
            pageUrl || null,
            attachmentUrl || null,
            JSON.stringify(clientContext || {}),
        ]
    )

    return result.rows[0]
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
