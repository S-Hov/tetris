import { getUserService, loginUserService, registerUserService } from "../services/authService.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"


export const register = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    const user = await registerUserService(email, password)

    res.status(201).json({
        data: {
            id: user.id,
            email: user.email
        },
        message: "User registered successfully",
        success: true
    })
})

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (typeof email !== 'string' || email.trim() === '') {
        const error = new Error("Invalid email")
        error.statusCode = 400
        throw error
    }

    if (typeof password !== 'string' || password.trim() === '') {
        const error = new Error("Invalid password")
        error.statusCode = 400
        throw error
    }

    const user = await loginUserService(email)

    if (!user) {
        const error = new Error("User not found")
        error.statusCode = 401
        throw error
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
        const error = new Error("Invalid password")
        error.statusCode = 401
        throw error
    }

    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    )

    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000
    });

    res.json({
        success: true,
        message: "Logged in successfully",
        data: {
            id: user.id,
            email: user.email
        }
    })
})

export const getMe = asyncHandler(async (req, res) => {
    const userId = req.user.id

    const user = await getUserService(userId)

    res.json({
        success: true,
        message: "User fetched successfully",
        data: user
    })
})

export const logout = (req, res) => {
    res.clearCookie('token')

    res.json({
        success: true,
        message: 'Logged out successfully'
    })
}