
/**
 *  0 => 'A', 25 => 'Z', 26 => 'AA', 27 => 'AB', ...
 */
export function numberToLetters(n) {
    if (n < 26) {
        return String.fromCharCode(65 + n);
    } else {
        return numberToLetters(Math.floor(n / 26) - 1) + numberToLetters(n % 26);
    }
}

/**
 * 'A' => 0, 'Z' => 25, 'AA' => 26, ...
 */
function lettersToNumber(letters) {
    let result = 0;
    const l = letters.length;
    for (let i = 0; i < l; i++) {
        let n = letters.charCodeAt(i) - 65 + (i < l - 1) ? 1 : 0;
        result += (n * (26 ** (l - i - 1)));
    }
    return result;
}


/**
 *  A1 => [0,0], B3 => [1,2], ...
 *
 * Note: also accepts lowercase coordinates
 */
export function toCartesian(cell) {
    cell = cell.toUpperCase();
    const [m, letters, numbers] = cell.match(/([A-Z]*)([0-9]*)/);
    if (m !== cell) {
        throw new Error('Invalid cell description');
    }
    const col = lettersToNumber(letters);
    const row = parseInt(numbers, 10) - 1
    return [col, row];
}