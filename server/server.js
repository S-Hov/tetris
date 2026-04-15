import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import productRouter from './routes/products.js'
import { logger } from './middleware/logger.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors({
    origin: 'http://localhost:3000', // frontend
    credentials: true
}))


app.use(express.json())
app.use(cookieParser())


const APP_NAME = process.env.APP_NAME || "App"

console.log(`App: ${APP_NAME}`)

app.use(logger)


app.use("/products", productRouter)

app.use(errorHandler)

const PORT = process.env.PORT || 8880

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
