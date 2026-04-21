import { useEffect, useRef, useState } from 'react'
import { createBoard } from '../../features/tetris/model/createBoard.js'
import { paintPieceOnBoard } from '../../features/tetris/model/paintPieceOnBoard.js'
import { checkCollision } from '../../features/tetris/model/checkCollision.js'
import { getRandomPiece } from '../../features/tetris/model/getRandomPiece.js'
import { rotatePiece } from '../../features/tetris/model/rotatePiece.js'
import { getDropPosition } from '../../features/tetris/model/getDropPosition.js'
import { lockPiece } from '../../features/tetris/model/lockPiece.js'
import { getStartPosition } from '../../features/tetris/model/getStartPosition.js'
import TetrisBoard from '../../features/tetris/ui/TetrisBoard.jsx'
import { getScoreForLines } from '../../features/tetris/model/getScoreForLines.js'

import './GamePage.css'

const LINE_CLEAR_ANIMATION_MS = 250
const ROTATION_KICK_OFFSETS = [0, -1, 1, -2, 2]

const GamePage = () => {
    const [board, setBoard] = useState(createBoard())
    const [currentPiece, setCurrentPiece] = useState(getRandomPiece())
    const [currentPosition, setCurrentPosition] = useState(getStartPosition(currentPiece))
    const [isGameOver, setIsGameOver] = useState(false)
    const [score, setScore] = useState(0)
    const [nextPiece, setNextPiece] = useState(getRandomPiece())
    const [level, setLevel] = useState(1)
    const [linesCleared, setLinesCleared] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const [clearingRows, setClearingRows] = useState([])
    const clearAnimationTimeoutRef = useRef(null)
    const boardRef = useRef(board)
    const currentPieceRef = useRef(currentPiece)
    const currentPositionRef = useRef(currentPosition)
    const nextPieceRef = useRef(nextPiece)

    const speed = Math.max(100, 1000 - level * 100)
    const isClearing = clearingRows.length > 0

    const ghostPosition = {
        x: currentPosition.x,
        y: getDropPosition(board, currentPiece, currentPosition),
    }

    useEffect(() => {
        boardRef.current = board
        currentPieceRef.current = currentPiece
        currentPositionRef.current = currentPosition
        nextPieceRef.current = nextPiece
    }, [board, currentPiece, currentPosition, nextPiece])

    useEffect(() => {
        return () => {
            if (clearAnimationTimeoutRef.current) {
                clearTimeout(clearAnimationTimeoutRef.current)
            }
        }
    }, [])

    const handleLockedPiece = (lockedPosition, boardSnapshot, pieceSnapshot, nextPieceSnapshot) => {
        const {
            mergedBoard,
            board: clearedBoard,
            clearedLinesCount,
            clearedRowIndices,
        } = lockPiece(boardSnapshot, pieceSnapshot, lockedPosition)
        const queuedPiece = nextPieceSnapshot
        const upcomingPiece = getRandomPiece()
        const startPos = getStartPosition(queuedPiece)

        if (clearedLinesCount > 0) {
            setBoard(mergedBoard)
            setClearingRows(clearedRowIndices)

            if (clearAnimationTimeoutRef.current) {
                clearTimeout(clearAnimationTimeoutRef.current)
            }

            clearAnimationTimeoutRef.current = setTimeout(() => {
                setScore(prevScore => prevScore + getScoreForLines(clearedLinesCount))
                setLinesCleared(prev => prev + clearedLinesCount)
                setClearingRows([])
                setBoard(clearedBoard)

                if (checkCollision(clearedBoard, queuedPiece, startPos)) {
                    clearAnimationTimeoutRef.current = null
                    setIsGameOver(true)
                    return
                }

                setCurrentPiece(queuedPiece)
                setNextPiece(upcomingPiece)
                setCurrentPosition(startPos)
                clearAnimationTimeoutRef.current = null
            }, LINE_CLEAR_ANIMATION_MS)

            return {
                didStartAnimation: true,
            }
        }

        setBoard(clearedBoard)

        if (checkCollision(clearedBoard, queuedPiece, startPos)) {
            setIsGameOver(true)
            return {
                nextPosition: lockedPosition,
            }
        }

        setCurrentPiece(queuedPiece)
        setNextPiece(upcomingPiece)

        return {
            nextPosition: startPos,
        }
    }

    useEffect(() => {
        setLevel(Math.floor(score / 1000) + 1)
    }, [score])

    useEffect(() => {
        if (isGameOver || isPaused || isClearing) return

        const intervalId = setInterval(() => {
            const position = currentPositionRef.current
            const piece = currentPieceRef.current
            const boardState = boardRef.current
            const queuedNextPiece = nextPieceRef.current
            const nextPosition = { x: position.x, y: position.y + 1 }

            if (checkCollision(boardState, piece, nextPosition)) {
                const result = handleLockedPiece(position, boardState, piece, queuedNextPiece)

                if (!result.didStartAnimation) {
                    setCurrentPosition(result.nextPosition)
                }
                return
            }

            setCurrentPosition(nextPosition)
        }, speed)

        return () => clearInterval(intervalId)
    }, [isClearing, isGameOver, isPaused, speed])


    useEffect(() => {
        const handleKeyDown = (event) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'KeyP', 'Escape'].includes(event.code)) {
                event.preventDefault()
            }

            if (isClearing) return

            if (event.code === 'KeyP' || event.code === 'Escape') {
                if (!isGameOver) {
                    setIsPaused(prev => !prev)
                }
                return
            }

            if (isGameOver || isPaused) return

            let nextPos = { ...currentPosition }

            switch (event.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    nextPos.x -= 1;
                    break
                case 'ArrowRight':
                case 'KeyD':
                    nextPos.x += 1;
                    break
                case 'ArrowDown':
                case 'KeyS':
                    nextPos.y += 1;
                    break
                case 'ArrowUp':
                case 'KeyW':
                    {
                        const rotated = rotatePiece(currentPiece)

                        for (const offsetX of ROTATION_KICK_OFFSETS) {
                            const kickedPosition = {
                                ...currentPosition,
                                x: currentPosition.x + offsetX,
                            }

                            if (!checkCollision(board, rotated, kickedPosition)) {
                                setCurrentPiece(rotated)
                                setCurrentPosition(kickedPosition)
                                break
                            }
                        }
                        return
                    }
                case 'Space':
                    {
                        const dropY = getDropPosition(board, currentPiece, currentPosition)
                        const finalPosition = { ...currentPosition, y: dropY }
                        const result = handleLockedPiece(finalPosition, board, currentPiece, nextPiece)

                        if (!result.didStartAnimation) {
                            setCurrentPosition(result.nextPosition)
                        }
                        return
                    }
                default:
                    return
            }

            if (!checkCollision(board, currentPiece, nextPos)) {
                setCurrentPosition(nextPos);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);

    }, [board, currentPiece, currentPosition, isClearing, isGameOver, isPaused, nextPiece])

    const restartGame = () => {
        if (!isGameOver) return
        const firstPiece = getRandomPiece()
        const next = getRandomPiece()

        setBoard(createBoard())
        setCurrentPiece(firstPiece)
        setNextPiece(next)
        setCurrentPosition(getStartPosition(firstPiece))
        setScore(0)
        setLevel(1)
        setLinesCleared(0)
        setClearingRows([])
        setIsPaused(false)
        setIsGameOver(false)

        if (clearAnimationTimeoutRef.current) {
            clearTimeout(clearAnimationTimeoutRef.current)
            clearAnimationTimeoutRef.current = null
        }
    }

    const boardWithGhost = isGameOver || isClearing
        ? board
        : paintPieceOnBoard(board, currentPiece, ghostPosition, {
            value: {
                type: currentPiece.type,
                variant: 'ghost',
            },
            overwrite: false,
        })

    const boardWithPiece = isGameOver || isClearing
        ? board
        : paintPieceOnBoard(boardWithGhost, currentPiece, currentPosition)


    return (
        <section className="tetris-section">
            <div className="container tetris-container">
                <div className="tetris-box">
                    <h2>Solo mod</h2>
                    <div className="tetris-layout">
                        <TetrisBoard board={boardWithPiece} clearingRows={clearingRows} />
                        <div className='right-board'>
                            <div className="next-piece-panel">
                                <h3><i class="fa-solid fa-eye"></i> Next Piece</h3>
                                <div className='next-piece'>
                                    <div
                                        className="next-piece-grid"
                                        style={{
                                            gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 35px)`,
                                            gridTemplateRows: `repeat(${nextPiece.shape.length}, 35px)`,
                                        }}
                                    >
                                        {nextPiece.shape.flatMap((row, rowIndex) =>
                                            row.map((cell, cellIndex) => (
                                                <div
                                                    key={`${rowIndex}-${cellIndex}`}
                                                    className={`next-piece-cell ${cell ? 'filled' : ''}`}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className='info-panel'>
                                <p><i class="fa-solid fa-star"></i> Score: <span>{score}</span></p>
                                <p><i class="fa-solid fa-grip-lines"></i> Lines: <span>{linesCleared}</span></p>
                                <p><i class="fas fa-gauge-high"></i> Level: <span>{level}</span></p>
                                <p><i class="fa-solid fa-trophy"></i> РЕКОРД <span>7984</span></p>
                                <p>Status: {isPaused ? 'Paused' : 'Playing'}</p>
                            </div>
                            <div className="actions">
                                <button type="button" className='action-item button' onClick={() => setIsPaused(prev => !prev)} disabled={isGameOver}>
                                    {isPaused ? (<i class="fa-solid fa-play"></i>) : (<i class="fa-solid fa-pause"></i>)}
                                    Pause
                                </button>
                                <button type="button" className='action-item button' onClick={restartGame} disabled={!isGameOver}>
                                    <i class="fa-solid fa-rotate-right"></i>
                                    Restart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default GamePage
