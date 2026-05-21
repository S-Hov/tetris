import { pool } from '../db/index.js'

export const DEFAULT_RANK_TIERS = [
    { key: 'bronze', label: 'Bronze', labelRu: 'Bronze', min: 0, max: 999, imageUrl: null },
    { key: 'silver', label: 'Silver', labelRu: 'Silver', min: 1000, max: 1999, imageUrl: null },
    { key: 'gold', label: 'Gold', labelRu: 'Gold', min: 2000, max: 2999, imageUrl: null },
    { key: 'platinum', label: 'Platinum', labelRu: 'Platinum', min: 3000, max: 3999, imageUrl: null },
    { key: 'diamond', label: 'Diamond', labelRu: 'Diamond', min: 4000, max: 4999, imageUrl: null },
    { key: 'master', label: 'Master', labelRu: 'Master', min: 5000, max: 5999, imageUrl: null },
    { key: 'legend', label: 'Legend', labelRu: 'Legend', min: 6000, max: null, imageUrl: null },
]

const WIN_BASE_POINTS = 25
const LOSS_BASE_POINTS = -15
const WIN_POINTS_CAP = 40
const LOSS_COMPENSATION_CAP = 7
const MMR_WIN_DELTA = 20
const MMR_LOSS_DELTA = -20

const RANK_TIER_CACHE_TTL_MS = 30_000
let rankTierCache = {
    expiresAt: 0,
    tiers: DEFAULT_RANK_TIERS,
}

export const getRankTiers = async () => {
    if (rankTierCache.expiresAt > Date.now()) {
        return rankTierCache.tiers
    }

    try {
        const { rows } = await pool.query(
            `
            SELECT tier_key, label, label_ru, min_points, max_points, image_url
            FROM rank_tiers
            WHERE status = 'active'
            ORDER BY min_points ASC, sort_order ASC, id ASC
            `
        )

        const tiers = rows.map((row) => ({
            key: row.tier_key,
            label: row.label,
            labelRu: row.label_ru || row.label,
            min: Number(row.min_points) || 0,
            max: row.max_points === null ? null : Number(row.max_points),
            imageUrl: row.image_url || null,
        }))

        rankTierCache = {
            expiresAt: Date.now() + RANK_TIER_CACHE_TTL_MS,
            tiers: tiers.length > 0 ? tiers : DEFAULT_RANK_TIERS,
        }
    } catch {
        rankTierCache = {
            expiresAt: Date.now() + RANK_TIER_CACHE_TTL_MS,
            tiers: DEFAULT_RANK_TIERS,
        }
    }

    return rankTierCache.tiers
}

export const getRankTier = async (rankPoints = 0) => {
    const points = Math.max(0, Number(rankPoints) || 0)
    const tiers = await getRankTiers()

    return tiers.find((tier) => (
        points >= tier.min && (tier.max === null || points <= tier.max)
    )) || tiers[0] || DEFAULT_RANK_TIERS[0]
}

export const calculateRankDelta = ({ result, score = 0, linesCleared = 0, scoreDiff = 0 }) => {
    if (result === 'win') {
        const performanceBonus =
            Math.floor(Math.max(0, score) / 500) +
            Math.floor(Math.max(0, linesCleared) / 10) * 2 +
            (scoreDiff >= 1500 ? 5 : 0)

        return Math.min(WIN_POINTS_CAP, WIN_BASE_POINTS + performanceBonus)
    }

    if (result === 'lose' || result === 'loss') {
        const compensation = Math.min(
            LOSS_COMPENSATION_CAP,
            Math.floor(Math.max(0, score) / 1200) +
            Math.floor(Math.max(0, linesCleared) / 15) * 2
        )

        return LOSS_BASE_POINTS + compensation
    }

    return 0
}

export const calculateMmrDelta = (result) => {
    if (result === 'win') return MMR_WIN_DELTA
    if (result === 'lose' || result === 'loss') return MMR_LOSS_DELTA

    return 0
}
