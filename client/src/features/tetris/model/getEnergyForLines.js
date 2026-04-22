export function getEnergyForLines(lines) {
    switch (lines) {
        case 1:
            return 15
        case 2:
            return 35
        case 3:
            return 60
        case 4:
            return 90
        default:
            return 0
    }
}