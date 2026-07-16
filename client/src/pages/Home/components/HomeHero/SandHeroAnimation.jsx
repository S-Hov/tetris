import { useEffect, useRef } from 'react'

const settings = {
    cellSize: 5,
    startText: 'PVP-BLOCKS',
    hiddenText: 'matchmaking online',
    releaseTestsPerFrame: 320,
    releaseChance: 0.035,
    gravity: 820,
    airDrag: 0.992,
    settleStepsPerFrame: 1,
    targetFrameMs: 1000 / 30,
    pileHoldSeconds: 0.65,
    hiddenFadeInSeconds: 0.4,
    reformDurationSeconds: 1.75,
    reformStaggerSeconds: 0.55,
    revealHoldSeconds: 2.4,
    revealFadeSeconds: 0.55,
}

const SandHeroAnimation = () => {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')

        if (!canvas || !ctx) return undefined

        let width = 0
        let height = 0
        let dpr = Math.min(window.devicePixelRatio || 1, 1.5)
        let cols = 0
        let rows = 0
        let fixedText = new Uint8Array()
        let textCells = []
        let looseCells = []
        let falling = []
        let pile = new Uint8Array()
        let reforming = []
        let hiddenAlpha = 0
        let phase = 'text'
        let phaseTime = 0
        let lastTime = performance.now()
        let lastDrawTime = lastTime
        let animationFrame = 0
        let isCanvasVisible = true
        let isDocumentVisible = !document.hidden
        const styles = window.getComputedStyle(document.documentElement)
        const readColor = (name, fallback) => styles.getPropertyValue(name).trim() || fallback
        const colors = {
            pvp: readColor('--turquoise-bright', '#00ffff'),
            tetris: readColor('--pink', '#ff00ff'),
            glow: readColor('--turquoise-glow-strong', 'rgba(0, 255, 255, 0.45)'),
            hidden: readColor('--turquoise-lite', '#baffff'),
        }

        const index = (col, row) => row * cols + col
        const colFromIndex = (i) => i % cols
        const rowFromIndex = (i) => Math.floor(i / cols)
        const inBounds = (col, row) => col >= 0 && col < cols && row >= 0 && row < rows
        const rand = (min, max) => min + Math.random() * (max - min)
        const randInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
        const clamp01 = (value) => Math.max(0, Math.min(1, value))
        const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)
        const colorForCol = (col) => (col * settings.cellSize < width * 0.42 ? 1 : 2)
        const colorValue = (colorId) => (colorId === 1 ? colors.pvp : colors.tetris)

        const shuffle = (array) => {
            for (let i = array.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1))
                const temp = array[i]
                array[i] = array[j]
                array[j] = temp
            }
        }

        const buildTextMask = () => {
            const maskCanvas = document.createElement('canvas')
            const maskCtx = maskCanvas.getContext('2d')

            if (!maskCtx) return

            maskCanvas.width = width
            maskCanvas.height = height

            const fontSize = Math.min(width * 0.17, height * 0.22, 112)

            maskCtx.clearRect(0, 0, width, height)
            maskCtx.fillStyle = '#fff'
            maskCtx.textAlign = 'center'
            maskCtx.textBaseline = 'middle'
            maskCtx.font = `900 ${fontSize}px system-ui, sans-serif`
            maskCtx.fillText(settings.startText, width / 2, height * 0.38)

            const image = maskCtx.getImageData(0, 0, width, height).data

            for (let row = 0; row < rows; row += 1) {
                for (let col = 0; col < cols; col += 1) {
                    const x = Math.floor(col * settings.cellSize + settings.cellSize / 2)
                    const y = Math.floor(row * settings.cellSize + settings.cellSize / 2)
                    const pixelIndex = (y * width + x) * 4

                    if (image[pixelIndex + 3] > 35) {
                        const cell = index(col, row)

                        fixedText[cell] = colorForCol(col)
                        textCells.push(cell)
                        looseCells.push(cell)
                    }
                }
            }

            shuffle(looseCells)
        }

        const resetCycle = () => {
            fixedText.fill(0)
            pile.fill(0)
            looseCells = textCells.slice()
            shuffle(looseCells)
            falling = []
            reforming = []

            for (const cell of textCells) fixedText[cell] = colorForCol(colFromIndex(cell))

            hiddenAlpha = 0
            phase = 'text'
            phaseTime = 0
        }

        const resize = () => {
            const rect = canvas.getBoundingClientRect()
            width = Math.max(1, Math.floor(rect.width))
            height = Math.max(1, Math.floor(rect.height))
            dpr = Math.min(window.devicePixelRatio || 1, 1.5)

            canvas.width = width * dpr
            canvas.height = height * dpr
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

            cols = Math.ceil(width / settings.cellSize)
            rows = Math.ceil(height / settings.cellSize)
            fixedText = new Uint8Array(cols * rows)
            pile = new Uint8Array(cols * rows)
            textCells = []
            looseCells = []
            falling = []
            reforming = []
            hiddenAlpha = 0
            phase = 'text'
            phaseTime = 0

            buildTextMask()
        }

        const releaseOneGrain = (cellIndex) => {
            const col = colFromIndex(cellIndex)
            const row = rowFromIndex(cellIndex)
            const colorId = fixedText[cellIndex] || colorForCol(col)

            fixedText[cellIndex] = 0
            falling.push({
                x: col * settings.cellSize,
                y: row * settings.cellSize,
                colorId,
                vx: rand(-22, 22),
                vy: rand(40, 150),
                drift: rand(-52, 52),
                driftTarget: rand(-82, 82),
                driftTimer: rand(0.18, 0.9),
            })
        }

        const releaseText = () => {
            if (looseCells.length === 0) {
                phase = 'falling'
                phaseTime = 0
                return
            }

            for (let i = 0; i < settings.releaseTestsPerFrame; i += 1) {
                if (looseCells.length === 0) break

                const listIndex = randInt(0, looseCells.length - 1)
                const cellIndex = looseCells[listIndex]

                if (fixedText[cellIndex] === 0) {
                    looseCells.splice(listIndex, 1)
                    continue
                }

                const col = colFromIndex(cellIndex)
                const row = rowFromIndex(cellIndex)
                const belowEmpty = row >= rows - 1 || fixedText[index(col, Math.min(row + 1, rows - 1))] === 0
                const sideEmpty =
                    col <= 0 ||
                    col >= cols - 1 ||
                    fixedText[index(Math.max(col - 1, 0), row)] === 0 ||
                    fixedText[index(Math.min(col + 1, cols - 1), row)] === 0
                const edgeMultiplier = belowEmpty || sideEmpty ? 3.3 : 1

                if (Math.random() < settings.releaseChance * edgeMultiplier) {
                    releaseOneGrain(cellIndex)
                    looseCells.splice(listIndex, 1)
                }
            }
        }

        const pileSolid = (col, row) => {
            if (row >= rows || col < 0 || col >= cols) return true
            return pile[index(col, row)] !== 0
        }

        const setPile = (col, row, colorId = colorForCol(col)) => {
            if (inBounds(col, row)) pile[index(col, row)] = colorId
        }

        const settleFallingParticle = (particle) => {
            let col = Math.floor(particle.x / settings.cellSize)
            let row = Math.floor(particle.y / settings.cellSize)

            col = Math.max(0, Math.min(cols - 1, col))
            row = Math.max(0, Math.min(rows - 1, row))

            if (!pileSolid(col, row)) {
                setPile(col, row, particle.colorId)
                return
            }

            if (!pileSolid(col - 1, row)) {
                setPile(col - 1, row, particle.colorId)
                return
            }

            if (!pileSolid(col + 1, row)) {
                setPile(col + 1, row, particle.colorId)
                return
            }

            for (let y = row - 1; y >= 0; y -= 1) {
                if (!pileSolid(col, y)) {
                    setPile(col, y, particle.colorId)
                    return
                }
            }
        }

        const updateFalling = (dt) => {
            for (let i = falling.length - 1; i >= 0; i -= 1) {
                const particle = falling[i]

                particle.driftTimer -= dt

                if (particle.driftTimer <= 0) {
                    particle.driftTarget = rand(-82, 82)
                    particle.driftTimer = rand(0.25, 1.2)
                }

                particle.drift += (particle.driftTarget - particle.drift) * dt * 2
                particle.vx += particle.drift * dt
                particle.vy += settings.gravity * dt
                particle.vx *= settings.airDrag
                particle.vy *= settings.airDrag
                particle.x += particle.vx * dt
                particle.y += particle.vy * dt

                const col = Math.floor(particle.x / settings.cellSize)
                const nextRow = Math.floor((particle.y + settings.cellSize) / settings.cellSize)

                if (particle.x < -60) particle.x = 0
                if (particle.x > width + 60) particle.x = width - settings.cellSize

                if (nextRow >= rows || pileSolid(col, nextRow)) {
                    settleFallingParticle(particle)
                    falling.splice(i, 1)
                }
            }

            if (phase === 'falling' && falling.length === 0) {
                phase = 'pile'
                phaseTime = 0
            }
        }

        const settlePileCell = (col, row) => {
            const current = index(col, row)

            const colorId = pile[current]

            if (colorId === 0) return

            if (!pileSolid(col, row + 1)) {
                pile[index(col, row + 1)] = colorId
                pile[current] = 0
                return
            }

            const preferLeft = Math.random() > 0.5
            const firstCol = preferLeft ? col - 1 : col + 1
            const secondCol = preferLeft ? col + 1 : col - 1

            if (!pileSolid(firstCol, row + 1)) {
                pile[index(firstCol, row + 1)] = colorId
                pile[current] = 0
                return
            }

            if (!pileSolid(secondCol, row + 1)) {
                pile[index(secondCol, row + 1)] = colorId
                pile[current] = 0
            }
        }

        const settlePile = () => {
            const leftToRight = Math.random() > 0.5

            for (let row = rows - 2; row >= 0; row -= 1) {
                if (leftToRight) {
                    for (let col = 1; col < cols - 1; col += 1) settlePileCell(col, row)
                } else {
                    for (let col = cols - 2; col >= 1; col -= 1) settlePileCell(col, row)
                }
            }
        }

        const collectPileCells = () => {
            const cells = []

            for (let row = rows - 1; row >= 0; row -= 1) {
                for (let col = 0; col < cols; col += 1) {
                    const cell = index(col, row)
                    if (pile[cell] !== 0) cells.push(cell)
                }
            }

            return cells
        }

        const startReform = () => {
            const pileCells = collectPileCells()
            const targets = textCells.slice()

            pile.fill(0)
            pileCells.sort((a, b) => rowFromIndex(b) - rowFromIndex(a))
            targets.sort((a, b) => rowFromIndex(b) - rowFromIndex(a))

            const count = Math.min(pileCells.length, targets.length)

            for (let i = 0; i < count; i += 1) {
                const source = pileCells[i]
                const target = targets[i]
                const sx = colFromIndex(source) * settings.cellSize
                const sy = rowFromIndex(source) * settings.cellSize
                const tx = colFromIndex(target) * settings.cellSize
                const ty = rowFromIndex(target) * settings.cellSize
                const colorId = colorForCol(colFromIndex(target))

                reforming.push({
                    sx,
                    sy,
                    tx,
                    ty,
                    x: sx,
                    y: sy,
                    colorId,
                    delay: rand(0, settings.reformStaggerSeconds),
                    duration: rand(settings.reformDurationSeconds * 0.75, settings.reformDurationSeconds * 1.15),
                    wave: rand(-18, 18),
                    phaseOffset: rand(0, Math.PI * 2),
                })
            }

            phase = 'reform'
            phaseTime = 0
        }

        const updateReform = () => {
            hiddenAlpha = 1

            let allArrived = true

            for (const particle of reforming) {
                const localTime = phaseTime - particle.delay

                if (localTime <= 0) {
                    particle.x = particle.sx
                    particle.y = particle.sy
                    allArrived = false
                    continue
                }

                const t = clamp01(localTime / particle.duration)
                const eased = easeInOutCubic(t)
                const arc = Math.sin(eased * Math.PI)
                const wobble = Math.sin(eased * Math.PI * 2 + particle.phaseOffset) * particle.wave * arc

                particle.x = particle.sx + (particle.tx - particle.sx) * eased + wobble
                particle.y = particle.sy + (particle.ty - particle.sy) * eased - arc * height * 0.08

                if (t < 1) allArrived = false
            }

            if (allArrived) {
                for (const cell of textCells) fixedText[cell] = colorForCol(colFromIndex(cell))

                reforming = []
                phase = 'hiddenHold'
                phaseTime = 0
                hiddenAlpha = 1
            }
        }

        const updatePhase = (dt) => {
            phaseTime += dt

            if (phase === 'text') releaseText()

            if (phase === 'pile' && phaseTime >= settings.pileHoldSeconds) {
                phase = 'hiddenFadeIn'
                phaseTime = 0
                hiddenAlpha = 0
            }

            if (phase === 'hiddenFadeIn') {
                hiddenAlpha = Math.min(1, phaseTime / settings.hiddenFadeInSeconds)
                if (hiddenAlpha >= 1) startReform()
            }

            if (phase === 'reform') updateReform()

            if (phase === 'hiddenHold' && phaseTime >= settings.revealHoldSeconds) {
                phase = 'hiddenFade'
                phaseTime = 0
            }

            if (phase === 'hiddenFade') {
                hiddenAlpha = Math.max(0, 1 - phaseTime / settings.revealFadeSeconds)
                if (hiddenAlpha <= 0) resetCycle()
            }
        }

        const drawHiddenText = () => {
            if (hiddenAlpha <= 0) return

            ctx.save()
            ctx.globalAlpha = hiddenAlpha
            ctx.fillStyle = colors.hidden
            ctx.shadowColor = colors.glow
            ctx.shadowBlur = 18
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.font = '900 18px system-ui, sans-serif'
            ctx.fillText(settings.hiddenText, width / 2, height - 38)
            ctx.restore()
        }

        const drawCells = (cells, color) => {
            const size = settings.cellSize
            ctx.fillStyle = color

            for (const cell of cells) {
                ctx.fillRect(colFromIndex(cell) * size, rowFromIndex(cell) * size, size, size)
            }
        }

        const drawFixedText = () => {
            const pvpCells = []
            const tetrisCells = []

            for (let row = 0; row < rows; row += 1) {
                for (let col = 0; col < cols; col += 1) {
                    const cell = index(col, row)
                    if (fixedText[cell] === 1) pvpCells.push(cell)
                    if (fixedText[cell] === 2) tetrisCells.push(cell)
                }
            }

            drawCells(pvpCells, colors.pvp)
            drawCells(tetrisCells, colors.tetris)
        }

        const drawPile = () => {
            const pvpCells = []
            const tetrisCells = []

            for (let row = 0; row < rows; row += 1) {
                for (let col = 0; col < cols; col += 1) {
                    const cell = index(col, row)
                    if (pile[cell] === 1) pvpCells.push(cell)
                    if (pile[cell] === 2) tetrisCells.push(cell)
                }
            }

            drawCells(pvpCells, colors.pvp)
            drawCells(tetrisCells, colors.tetris)
        }

        const drawMovingParticles = (particles) => {
            const size = settings.cellSize

            for (const particle of particles) {
                const color = colorValue(particle.colorId)
                ctx.fillStyle = color
                ctx.fillRect(particle.x, particle.y, size, size)
            }
        }

        const draw = () => {
            ctx.clearRect(0, 0, width, height)
            drawHiddenText()
            drawFixedText()
            drawMovingParticles(falling)
            drawPile()
            drawMovingParticles(reforming)
        }

        const tick = (now) => {
            animationFrame = requestAnimationFrame(tick)

            if (!isCanvasVisible || !isDocumentVisible) {
                lastTime = now
                lastDrawTime = now
                return
            }

            if (now - lastDrawTime < settings.targetFrameMs) {
                return
            }

            const dt = Math.min((now - lastTime) / 1000, 0.033)
            lastTime = now
            lastDrawTime = now

            updatePhase(dt)
            updateFalling(dt)

            if (!['reform', 'hiddenHold', 'hiddenFade'].includes(phase)) {
                for (let i = 0; i < settings.settleStepsPerFrame; i += 1) settlePile()
            }

            draw()
        }

        const observer = new ResizeObserver(resize)
        const visibilityObserver = new IntersectionObserver(([entry]) => {
            isCanvasVisible = entry.isIntersecting
        })
        const handleVisibilityChange = () => {
            isDocumentVisible = !document.hidden
        }

        observer.observe(canvas)
        visibilityObserver.observe(canvas)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        resize()
        animationFrame = requestAnimationFrame(tick)

        return () => {
            observer.disconnect()
            visibilityObserver.disconnect()
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            cancelAnimationFrame(animationFrame)
        }
    }, [])

    return <canvas ref={canvasRef} className="home-hero-sand" aria-hidden="true" />
}

export default SandHeroAnimation
