import { forbidden, notFound } from '../helpers/error.helper.js'
import * as productRepo from '../repositories/productRepository.js'

export const getProductsPaginatedService = async (page, limit) => {
    const offset = (page - 1) * limit
    
    const { items, totalCount } = await productRepo.getProductsWithCountRepo(limit, offset)

    return {
        products: items,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
    }
}

export const getProductByIdService = async (id) => {
    const product = await productRepo.getProductByIdRepo(id)

    if (!product) {
        throw notFound(`Product with id ${id} not found`)
    }

    return product
}

export const deleteProductService = async (id, user) => {
    const product = await productRepo.getProductByIdRepo(id)

    if (!product) {
        throw notFound(`Product with id ${id} not found`)
    }

    if (user.role !== 'admin' && product.user_id !== user.id) {
        throw forbidden("You can't delete this product")
    }

    return await productRepo.deleteProductRepo(id)
}
export const updateProductService = async (id, name, price, user) => {
    const product = await productRepo.getProductByIdRepo(id)

    if (!product) {
        throw notFound(`Product with id ${id} not found`)
    }

    if (user.role !== 'admin' && product.user_id !== user.id) {
        throw forbidden("You can't update this product")
    }

    return await productRepo.updateProductRepo(id, name, price)
}

export const searchProductsService = async (name) => {
    const filteredProducts = await productRepo.searchProductsRepo(name)

    if (filteredProducts.length === 0) {
        throw notFound(`Product with name ${name} not found`)
    }

    return filteredProducts
}

export const addProductService = async (name, price, userId) => {
    return await productRepo.addProductRepo(name, price, userId)
}

export const getProductsCountService = async () => {
    return await productRepo.getProductsCountRepo() || 0
}