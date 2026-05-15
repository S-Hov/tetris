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
            id,
            currency_code,
            network_key,
            network_name,
            address,
            address_label,
            memo_tag,
            metadata
        FROM donation_wallets
        WHERE status = 'active'
        ORDER BY sort_order ASC, currency_code ASC, network_name ASC, id ASC
        `
    )

    return result.rows
}

export const getDonationWalletByIdRepo = async (id) => {
    const result = await pool.query(
        `
        SELECT id, currency_code, network_key, network_name, address, address_label, memo_tag
        FROM donation_wallets
        WHERE id = $1 AND status = 'active'
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
