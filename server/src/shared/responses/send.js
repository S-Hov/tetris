import { getLang, translate } from './messages/index.js'

const createPayload = ({
    success,
    req,
    code,
    data = {},
    meta,
    errors,
    extra,
    message,
}) => {
    const payload = {
        success,
        code,
        message: message || translate(code, getLang(req)),
        data,
    }

    if (meta !== undefined) {
        payload.meta = meta
    }

    if (errors !== undefined) {
        payload.errors = errors
    }

    return {
        ...payload,
        ...(extra && typeof extra === 'object' ? extra : {}),
    }
}

export const ok = (res, req, code = 'COMMON.OK', options = {}) => {
    const {
        status = 200,
        data = {},
        meta,
        extra,
        message,
    } = options

    return res.status(status).json(createPayload({
        success: true,
        req,
        code,
        data,
        meta,
        extra,
        message,
    }))
}

export const fail = (res, req, code = 'COMMON.BAD_REQUEST', options = {}) => {
    const {
        status = 400,
        data = {},
        errors,
        meta,
        extra,
        message,
    } = options

    return res.status(status).json(createPayload({
        success: false,
        req,
        code,
        data,
        errors,
        meta,
        extra,
        message,
    }))
}
