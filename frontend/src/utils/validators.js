/**
 * Real-name validation — mirrors backend/utils/nameValidation.js and
 * NAME_REGEX in backend/config/constants.js. Keep the two in sync.
 *
 * A "word" is letters (Latin incl. accented, or Arabic/Urdu script),
 * optionally joined by a single . ' or - to more letters, and may end with
 * a dot. Words are separated by exactly one space.
 */
const NAME_LETTER = "[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F\\u0621-\\u063A\\u0641-\\u0652\\u0671-\\u06D3\\u06FA-\\u06FC]"
const NAME_WORD   = NAME_LETTER + "+(?:[.'-]" + NAME_LETTER + "+)*\\.?"

export const NAME_REGEX    = new RegExp('^' + NAME_WORD + '(?: ' + NAME_WORD + ')*$')
export const FULL_NAME_MIN = 2
export const FULL_NAME_MAX = 50

export const normalizeName = function(value) {
    return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ')
}

// Returns an error message for the given name, or null when it is valid.
export const getFullNameError = function(value) {
    const name = normalizeName(value)
    if (!name)                       return 'Full name is required'
    if (name.length < FULL_NAME_MIN) return 'Full name must be at least ' + FULL_NAME_MIN + ' characters'
    if (name.length > FULL_NAME_MAX) return 'Full name cannot exceed ' + FULL_NAME_MAX + ' characters'
    if (/[0-9٠-٩۰-۹]/.test(name)) return 'Full name cannot contain numbers'
    if (!NAME_REGEX.test(name)) return "Use letters and single spaces only; . ' - are allowed only between letters"
    return null
}
