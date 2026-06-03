import { getAssetUrl, getAvatarFallback } from '../../rating.utils.js'

import './RatingPlayerMedia.css'

export const RatingAvatar = ({ player, small = false }) => (
    <span className={`rating-avatar ${small ? 'rating-avatar--small' : ''}`}>
        {player.avatarUrl ? renderAvatarMedia(getAssetUrl(player.avatarUrl), player.username) : getAvatarFallback(player.username)}
    </span>
)

export const RankTierImage = ({ tier, className = '' }) => {
    const imageUrl = getAssetUrl(tier?.imageUrl)

    if (!imageUrl) {
        return null
    }

    return (
        <span className={className}>
            <img src={imageUrl} alt={tier?.label || 'rank'} />
        </span>
    )
}

const renderAvatarMedia = (src, alt) => {
    if (/\.(webm|mp4|mov|ogg|ogv|m4v)(?:[?#]|$)/i.test(src)) {
        return <video src={src} autoPlay loop muted playsInline aria-label={alt || 'avatar'} />
    }

    return <img src={src} alt={alt || 'avatar'} />
}
