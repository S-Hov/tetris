export const RANK_TIERS = [
    { key: 'bronze', label: 'Bronze', min: 0, max: 999 },
    { key: 'silver', label: 'Silver', min: 1000, max: 1999 },
    { key: 'gold', label: 'Gold', min: 2000, max: 2999 },
    { key: 'platinum', label: 'Platinum', min: 3000, max: 3999 },
    { key: 'diamond', label: 'Diamond', min: 4000, max: 4999 },
    { key: 'master', label: 'Master', min: 5000, max: 5999 },
    { key: 'legend', label: 'Legend', min: 6000, max: null },
]

const WIN_BASE_POINTS = 25
const LOSS_BASE_POINTS = -15
const WIN_POINTS_CAP = 40
const LOSS_COMPENSATION_CAP = 7
const MMR_WIN_DELTA = 20
const MMR_LOSS_DELTA = -20

export const getRankTier = (rankPoints = 0) => {
    const points = Math.max(0, Number(rankPoints) || 0)

    return RANK_TIERS.find((tier) => (
        points >= tier.min && (tier.max === null || points <= tier.max)
    )) || RANK_TIERS[0]
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
