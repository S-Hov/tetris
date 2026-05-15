import { badRequest, notFound } from '../helpers/error.helper.js'
import {
    createDonationEventRepo,
    createDonationRepo,
    createSupportRequestRepo,
    getActiveDonationWalletsRepo,
    getDonationWalletByIdRepo,
} from '../repositories/supportRepository.js'

const SUPPORT_CATEGORIES = new Set(['bug', 'idea', 'mode', 'balance', 'other'])

export const createSupportRequestService = async ({ userId, body, headers }) => {
    const category = normalizeString(body.category) || 'other'
    const message = normalizeString(body.message)

    if (!SUPPORT_CATEGORIES.has(category)) {
        throw badRequest('Unsupported support category')
    }

    if (!message || message.length < 10) {
        throw badRequest('Message must contain at least 10 characters')
    }

    const request = await createSupportRequestRepo({
        userId,
        category,
        contactName: normalizeString(body.contactName),
        contactEmail: normalizeString(body.contactEmail),
        title: normalizeString(body.title),
        message,
        pageUrl: normalizeString(body.pageUrl),
        attachmentUrl: normalizeString(body.attachmentUrl),
        clientContext: {
            ...(body.clientContext && typeof body.clientContext === 'object' ? body.clientContext : {}),
            userAgent: headers['user-agent'] || null,
        },
    })

    return { request }
}

export const getDonationWalletsService = async () => {
    const wallets = await getActiveDonationWalletsRepo()

    return {
        wallets: wallets.map((wallet) => ({
            id: wallet.id,
            currencyCode: wallet.currency_code,
            networkKey: wallet.network_key,
            networkName: wallet.network_name,
            address: wallet.address,
            addressLabel: wallet.address_label,
            memoTag: wallet.memo_tag,
            metadata: wallet.metadata || {},
        })),
    }
}

export const createDonationService = async ({ userId, body }) => {
    const walletId = Number.parseInt(body.walletId, 10)

    if (!Number.isInteger(walletId) || walletId <= 0) {
        throw badRequest('Donation wallet is required')
    }

    const wallet = await getDonationWalletByIdRepo(walletId)

    if (!wallet) {
        throw notFound('Donation wallet not found')
    }

    const expectedAmount = normalizeAmount(body.expectedAmount, { required: true })

    const donation = await createDonationRepo({
        userId,
        wallet,
        donorName: normalizeString(body.donorName),
        donorContact: normalizeString(body.donorContact),
        expectedAmount,
        note: normalizeString(body.note),
    })

    await createDonationEventRepo({
        donationId: donation.id,
        eventType: 'created',
        statusTo: donation.status,
        payload: {
            walletId: wallet.id,
            currencyCode: wallet.currency_code,
            networkKey: wallet.network_key,
        },
    })

    return {
        donation: {
            id: donation.id,
            status: donation.status,
            currencyCode: donation.currency_code,
            networkKey: donation.network_key,
            expectedAmount: donation.expected_amount,
            expiresAt: donation.expires_at,
            createdAt: donation.created_at,
        },
        wallet: {
            id: wallet.id,
            currencyCode: wallet.currency_code,
            networkKey: wallet.network_key,
            networkName: wallet.network_name,
            address: wallet.address,
            addressLabel: wallet.address_label,
            memoTag: wallet.memo_tag,
        },
    }
}

const normalizeString = (value) => {
    if (typeof value !== 'string') {
        return ''
    }

    return value.trim()
}

const normalizeAmount = (value, { required = false } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (required) {
            throw badRequest('Donation amount is required')
        }

        return null
    }

    const normalized = String(value).replace(',', '.').trim()
    const amount = Number(normalized)

    if (!Number.isFinite(amount) || amount <= 0) {
        throw badRequest('Donation amount must be greater than zero')
    }

    return normalized
}
