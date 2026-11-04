import {
  DEFAULT_GENERATOR_OPTIONS,
  type PasswordGeneratorOptions,
} from './crypto'

const STORAGE_KEY = 'vault_gen_defaults'

/** Generator options with the user's saved defaults applied. */
export function loadGeneratorDefaults(): PasswordGeneratorOptions {
  if (typeof window === 'undefined') return DEFAULT_GENERATOR_OPTIONS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...DEFAULT_GENERATOR_OPTIONS, ...JSON.parse(saved) }
  } catch {
    // Corrupt value: fall through to the defaults
  }
  return DEFAULT_GENERATOR_OPTIONS
}

/** Used by the generator dialog and when a new login is created. */
export function saveGeneratorDefaults(options: PasswordGeneratorOptions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
}

export function sameGeneratorOptions(
  a: PasswordGeneratorOptions,
  b: PasswordGeneratorOptions,
) {
  return (Object.keys(a) as (keyof PasswordGeneratorOptions)[]).every(
    (key) => a[key] === b[key],
  )
}
