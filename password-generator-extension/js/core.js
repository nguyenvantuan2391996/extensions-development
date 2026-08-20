import { LOWER, UPPER, NUMBER, SYMBOL, OTHER, AMBIGUOUS, WORDLIST } from "./constants.js";

/* ---------- Secure randomness ---------- */

export function secureRandomInt(maxExclusive) {
    const range = Math.floor(0xffffffff / maxExclusive) * maxExclusive;
    const array = new Uint32Array(1);
    let x;
    do {
        crypto.getRandomValues(array);
        x = array[0];
    } while (x >= range);
    return x % maxExclusive;
}

function secureShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/* ---------- Character pools ---------- */

export function buildCharPools(options) {
    const excludeAmbiguous = !!options.excludeAmbiguous;
    const customExclude = options.customExclude || "";

    const stripChars = (str) => {
        let chars = str;
        if (excludeAmbiguous) {
            chars = [...chars].filter((c) => !AMBIGUOUS.includes(c)).join("");
        }
        if (customExclude) {
            chars = [...chars].filter((c) => !customExclude.includes(c)).join("");
        }
        return chars;
    };

    const pools = [
        options.includeLower ? stripChars(LOWER) : "",
        options.includeUpper ? stripChars(UPPER) : "",
        options.includeNumber ? stripChars(NUMBER) : "",
        options.includeSymbol ? stripChars(SYMBOL) : "",
        options.includeOther ? stripChars(OTHER) : ""
    ];

    return pools.filter((p) => p.length > 0);
}

/* ---------- Password generation ---------- */

function violatesSequential(result, char) {
    const n = result.length;
    if (n === 0) return false;
    if (n >= 1 && result[n - 1] === char) {
        if (n >= 2 && result[n - 2] === char) return true;
    }
    if (n < 2) return false;
    const a = result[n - 2].charCodeAt(0);
    const b = result[n - 1].charCodeAt(0);
    const c = char.charCodeAt(0);
    return (b - a === 1 && c - b === 1) || (b - a === -1 && c - b === -1);
}

function generateRandomPassword(length, pools, excludeDuplicates, avoidSequential) {
    const allChars = pools.join("");
    const result = [];

    const isBad = (char) =>
        (excludeDuplicates && result.includes(char)) ||
        (avoidSequential && violatesSequential(result, char));

    // Give each selected pool a guaranteed character at a random position (rather
    // than a fixed leading position + a final shuffle), so the left-to-right build
    // order matches the final order and the sequential/duplicate checks above stay
    // valid for the actual output.
    const guaranteedPool = new Map();
    if (length >= pools.length) {
        const positions = secureShuffle([...Array(length).keys()]).slice(0, pools.length);
        pools.forEach((pool, i) => guaranteedPool.set(positions[i], pool));
    }

    for (let i = 0; i < length; i++) {
        const pool = guaranteedPool.get(i) || allChars;
        let char;
        let attempts = 0;
        do {
            char = pool[secureRandomInt(pool.length)];
            attempts++;
        } while (isBad(char) && attempts < 50);
        result.push(char);
    }

    return result.join("");
}

export function generatePasswordFromOptions(options) {
    let length = parseInt(options.length, 10);
    if (Number.isNaN(length)) length = 16;
    length = Math.max(6, Math.min(64, length));

    const pools = buildCharPools(options);
    const allChars = pools.join("");

    if (!allChars) {
        return { error: true };
    }

    const excludeDuplicates = !!options.excludeDuplicates;
    const avoidSequential = !!options.avoidSequential;
    const effectiveLength = excludeDuplicates ? Math.min(length, allChars.length) : length;
    const value = generateRandomPassword(effectiveLength, pools, excludeDuplicates, avoidSequential);

    return { value, bits: value.length * Math.log2(allChars.length) };
}

/* ---------- Passphrase generation ---------- */

export function pickRandomWord(capitalize) {
    let word = WORDLIST[secureRandomInt(WORDLIST.length)];
    if (capitalize) word = word[0].toUpperCase() + word.slice(1);
    return word;
}

export function pickRandomPassphraseNumber() {
    return String(secureRandomInt(90) + 10);
}

export function assemblePassphrase(words, number, separator) {
    const parts = number !== null && number !== undefined ? [...words, number] : words;
    return parts.join(separator);
}

export function estimatePassphraseBits(wordCount, hasNumber) {
    let bits = wordCount * Math.log2(WORDLIST.length);
    if (hasNumber) bits += Math.log2(90);
    return bits;
}

export function generatePassphraseFromOptions(options) {
    const wordCount = parseInt(options.wordCount, 10) || 6;
    const separator = options.separator ?? "-";
    const capitalize = !!options.capitalize;
    const includeNumber = !!options.includeNumber;

    const words = [];
    for (let i = 0; i < wordCount; i++) {
        words.push(pickRandomWord(capitalize));
    }
    const number = includeNumber ? pickRandomPassphraseNumber() : null;

    const value = assemblePassphrase(words, number, separator);
    const bits = estimatePassphraseBits(wordCount, includeNumber);

    return { value, bits, words, number };
}

/* ---------- Strength estimate for an arbitrary (e.g. pasted) password ---------- */

export function estimatePasswordStrength(value) {
    if (!value) return { bits: 0 };

    let poolSize = 0;
    if (/[a-z]/.test(value)) poolSize += 26;
    if (/[A-Z]/.test(value)) poolSize += 26;
    if (/[0-9]/.test(value)) poolSize += 10;
    if (/[!-/:-@[-`{-~]/.test(value)) poolSize += 32;
    if (/[^\x00-\x7f]/.test(value)) poolSize += 20;
    if (poolSize === 0) poolSize = 1;

    let bits = value.length * Math.log2(poolSize);

    // Repeated characters contribute little real entropy beyond the first use.
    const uniqueRatio = new Set(value).size / value.length;
    bits *= 0.5 + 0.5 * uniqueRatio;

    // Discount runs like "abc", "123", or "aaa" found anywhere in the string.
    let weakRuns = 0;
    for (let i = 0; i < value.length - 2; i++) {
        if (violatesSequential([value[i], value[i + 1]], value[i + 2])) weakRuns++;
    }
    bits = Math.max(0, bits - weakRuns * 2);

    return { bits };
}
