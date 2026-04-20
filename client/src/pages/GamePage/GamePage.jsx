import { useEffect, useState } from 'react'
import { createBoard } from '../../features/tetris/model/createBoard.js'
import { PIECES } from '../../features/tetris/model/pieces.js'
import { paintPieceOnBoard } from '../../features/tetris/model/paintPieceOnBoard.js'
import TetrisBoard from '../../features/tetris/ui/TetrisBoard.jsx'
import { mergePieceToBoard } from '../../features/tetris/model/mergePieceToBoard.js'

import './GamePage.css'
import { checkCollision } from '../../features/tetris/model/checkCollision.js'
import { getRandomPiece } from '../../features/tetris/model/getRandomPiece.js'

const GamePage = () => {
    const [board, setBoard] = useState(createBoard())
    const [currentPiece, setCurrentPiece] = useState(PIECES.O)
    const [currentPosition, setCurrentPosition] = useState({ x: 4, y: 0 })
    const [isGameOver, setIsGameOver] = useState(false)
    useEffect(() => {
        if (isGameOver) {
            console.log('Game Over')
        }
    }, [isGameOver])
    useEffect(() => {
        if (isGameOver) return

        const intervalId = setInterval(() => {
            setCurrentPosition((prevPosition) => {
                const nextPosition = { x: prevPosition.x, y: prevPosition.y + 1 }

                if (checkCollision(board, currentPiece, nextPosition)) {
                    const newBoard = mergePieceToBoard(board, currentPiece, prevPosition)
                    setBoard(newBoard)

                    const nextPiece = getRandomPiece()
                    const startPos = { x: 4, y: 0 }

                    if (checkCollision(newBoard, nextPiece, startPos)) {
                        setIsGameOver(true)
                        return prevPosition
                    }

                    setCurrentPiece(nextPiece)
                    return startPos
                }

                return nextPosition;
            })
        }, 1000)

        return () => clearInterval(intervalId)
    }, [currentPiece, board, isGameOver])


    useEffect(() => {
        if (isGameOver) return
        const handleKeyDown = (event) => {
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
                default:
                    return
            }

            if (!checkCollision(board, currentPiece, nextPos)) {
                setCurrentPosition(nextPos);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);

    }, [board, currentPiece, currentPosition, isGameOver])


    const boardWithPiece = isGameOver
        ? board
        : paintPieceOnBoard(board, currentPiece, currentPosition)


    return (
        <section className="tetris-section">
            <div className="container tetris-container">
                <div className="tetris-box">
                    <h2>Game</h2>
                    <TetrisBoard board={boardWithPiece} />
                </div>
            </div>
        </section>
    )
}

export default GamePage