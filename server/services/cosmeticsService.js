import { getUserCosmeticInventoryRepo } from '../repositories/cosmeticsRepository.js'

export const getUserCosmeticInventoryService = async (userId) => {
    return await getUserCosmeticInventoryRepo(userId)
}
