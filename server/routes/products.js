import express from 'express'

import { checkAuth } from '../middleware/checkAuth.js'
import { addProduct, deleteProduct, getProductsPaginated, getProductById, getProductsCount, searchProducts, updateProduct } from '../controllers/productController.js'
import { validateProductData, validateProductId } from '../middleware/validateProduct.js'
import { checkRole } from '../middleware/checkRole.js'

const productRouter = express.Router()

productRouter.get('/', getProductsPaginated)

productRouter.get('/search', searchProducts)

productRouter.get('/count', getProductsCount)

productRouter.get('/:id', validateProductId, getProductById)

productRouter.post('/', checkAuth, validateProductData, addProduct)

productRouter.delete('/:id', checkAuth, validateProductId, deleteProduct)

productRouter.put('/:id', checkAuth, validateProductId, validateProductData, updateProduct)


export default productRouter