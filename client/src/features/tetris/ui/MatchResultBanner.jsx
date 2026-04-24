const MatchResultBanner = ({ result }) => {
    return (
        <div className={`game-banner game-banner--${result}`} role="status" aria-live="polite">
            <span className="game-banner__eyebrow">
                {result === 'win' ? 'Round Complete' : 'Round Lost'}
            </span>
            <h3 className="game-banner__title">{result === 'win' ? 'Победа' : 'Поражение'}</h3>
            <p className="game-banner__description">
                {result === 'win'
                    ? 'Вы забрали этот раунд. Возвращаем вас в лобби вместе с соперником.'
                    : 'Раунд завершён. Сейчас вы оба вернётесь в лобби и сможете начать заново.'}
            </p>
        </div>
    )
}

export default MatchResultBanner
