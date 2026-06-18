import { useContext } from 'react'

import UserActionsContext from '@/shared/context/userActionsContext.js'

const useUserActions = () => {
    const context = useContext(UserActionsContext)

    if (!context) {
        throw new Error('useUserActions must be used inside UserActionsProvider')
    }

    return context
}

export default useUserActions
