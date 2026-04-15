import * as productService from "../services/productService.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { badRequest } from "../helpers/error.helper.js"

export const getProductsPaginated = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 5

    if (page < 1 || limit < 1) {
        throw badRequest("Invalid page or limit")
    }

    const result = await productService.getProductsPaginatedService(page, limit)

    res.status(200).json({
        data: result,
        success: true,
        message: "Products fetched successfully"
    })
})

export const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await productService.getProductByIdService(id)

    res.status(200).json({
        data: product,
        message: "Product fetched successfully",
        success: true
    })
})

export const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const deletedProduct = await productService.deleteProductService(id, req.user);

    res.status(200).json({
        data: deletedProduct,
        message: "Product deleted successfully",
        success: true
    });
})

export const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params

    const { name, price } = req.body

    const updatedProduct = await productService.updateProductService(id, name, price)

    return res.status(200).json({
        data: updatedProduct,
        message: "Product updated successfully",
        success: true
    })
})

export const searchProducts = asyncHandler(async (req, res) => {
    const { name } = req.query

    if (typeof name !== 'string' || name.trim() === '') {
        throw badRequest("Invalid name")
    }

    const filteredProducts = await productService.searchProductsService(name)

    return res.status(200).json({
        data: filteredProducts,
        message: "Products fetched successfully",
        success: true
    })
})

export const addProduct = asyncHandler(async (req, res) => {
    const { name, price } = req.body
    const userId = req.user.id

    const newProduct = await productService.addProductService(name, price, userId)

    return res.status(201).json({
        data: newProduct,
        message: "Product added successfully",
        success: true
    })
})

export const getProductsCount = asyncHandler(async (req, res) => {
    const count = await productService.getProductsCountService()

    res.status(200).json({
        data: count,
        message: "Products count fetched successfully",
        success: true
    })
})