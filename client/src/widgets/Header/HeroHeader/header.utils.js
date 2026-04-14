export function parseKValue(str) {
    if (typeof str !== 'string') str = String(str)
    str = str.trim().toLowerCase()

    if (str.includes('k')) {
        const num = parseFloat(str.replace('k', ''))
        if (!Number.isNaN(num)) return num * 1000
    }

    return parseInt(str, 10)
}

export function formatNumberValue(num, isKFormat) {
    if (isKFormat && num >= 1000) {
        let kVal = (num / 1000).toFixed(1)
        if (kVal.endsWith('.0')) kVal = kVal.slice(0, -2)
        return `${kVal}k`
    }

    return String(num)
}