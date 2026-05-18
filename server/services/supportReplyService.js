export const replyToSupportRequest = async ({
    ticketId,
    adminTelegramId,
    replyText,
}) => {
    console.log('Support reply:', {
        ticketId,
        adminTelegramId,
        replyText,
    })
}