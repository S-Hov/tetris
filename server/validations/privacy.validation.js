import { z } from 'zod'

const visibilitySchema = z.enum(['public', 'friends', 'private'])

export const updatePrivacySettingsSchema = z.object({
    profileVisibility: visibilitySchema.optional(),
    friendRequestsVisibility: visibilitySchema.optional(),
    roomInvitesVisibility: visibilitySchema.optional(),
    matchInvitesVisibility: visibilitySchema.optional(),
    messagesVisibility: visibilitySchema.optional(),
    clubInvitesVisibility: visibilitySchema.optional(),
}).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one privacy setting is required',
})
