import TetrisBoard from './TetrisBoard.jsx'
import './GameLayout.css'

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(' ')

const GameLayout = ({
    mode,
    score,
    board,
    clearingRows = [],
    boardClassName = '',
    boardShellClassName = '',
    boardShellStyle,
    boardDecor = null,
    leftRail = null,
    sidebar = null,
    overlay = null,
    banner = null,
    secondaryColumn = null,
}) => {
    return (
        <section className={joinClassNames('game-layout', `game-layout--${mode.variant}`)}>
            <div className="container game-layout__container">
                <div className="game-layout__primary-column">
                    <header className="game-layout__header">
                        <h2 className="game-layout__title">{mode.title}</h2>
                        {typeof score === 'number' && (
                            <p className="game-layout__header-metric">
                                <i className="fa-solid fa-star"></i> Score: <b>{score}</b>
                            </p>
                        )}
                    </header>

                    <div className="game-layout__stage">
                        <div
                            className={joinClassNames('game-layout__board-shell', boardShellClassName)}
                            style={boardShellStyle}
                        >
                            <TetrisBoard
                                board={board}
                                clearingRows={clearingRows}
                                className={boardClassName}
                            />
                            {boardDecor}
                        </div>

                        {leftRail}
                        {sidebar ? <aside className="game-layout__sidebar">{sidebar}</aside> : null}
                        {banner}
                    </div>
                </div>

                {secondaryColumn ? (
                    <aside className="game-layout__secondary-column">{secondaryColumn}</aside>
                ) : null}
            </div>

            {overlay}
        </section>
    )
}

export default GameLayout
