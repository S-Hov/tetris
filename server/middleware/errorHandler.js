export const errorHandler = (err, req, res, next) => {
    console.error("ERROR: ", err)

    const status = err.statusCode || 500

    res.status(status).json({
        data: null,
        message: err.message || "Internal server error",
        success: false
    })
}