import {
  DEFAULT_GENERATOR_OPTIONS,
  type PasswordGeneratorOptions,
} from './crypto'

const STORAGE_KEY = 'vault_gen_defaults'

/** Keys from before every option was saved; still read as a fallback. */
const LEGACY_KEYS = {
  length: 'vault_gen_default_len',
  symbols: 'vault_gen_default_symbols',
  numbers: 'vault_gen_default_numbers',
} as const

function readLegacy(): Partial<PasswordGeneratorOptions> {
  const legacy: Partial<PasswordGeneratorOptions> = {}
  const length = Number.parseInt(
    localStorage.getItem(LEGACY_KEYS.length) ?? '',
    10,
  )
  const symbols = localStorage.getItem(LEGACY_KEYS.symbols)
  const numbers = localStorage.getItem(LEGACY_KEYS.numbers)
  if (Number.isFinite(length)) legacy.length = length
  if (symbols !== null) legacy.symbols = symbols === 'true'
  if (numbers !== null) legacy.numbers = numbers === 'true'
  return legacy
}

/** Generator options with the user's saved defaults applied. */
export function loadGeneratorDefaults(): PasswordGeneratorOptions {
  if (typeof window === 'undefined') return DEFAULT_GENERATOR_OPTIONS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...DEFAULT_GENERATOR_OPTIONS, ...JSON.parse(saved) }
  } catch {
    // Corrupt value: fall through to the defaults
  }
  return { ...DEFAULT_GENERATOR_OPTIONS, ...readLegacy() }
}

/** Used by the generator dialog and when a new login is created. */
export function saveGeneratorDefaults(options: PasswordGeneratorOptions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  for (const key of Object.values(LEGACY_KEYS)) localStorage.removeItem(key)
}

export function sameGeneratorOptions(
  a: PasswordGeneratorOptions,
  b: PasswordGeneratorOptions,
) {
  return (Object.keys(a) as (keyof PasswordGeneratorOptions)[]).every(
    (key) => a[key] === b[key],
  )
}
