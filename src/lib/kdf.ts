/**
 * Key derivation settings, shared by the browser (which runs the KDF) and the
 * server (which stores the settings and refuses weak ones). No crypto here,
 * so both bundles can import it.
 */

export interface KdfParams {
  /** Stored with every vault, so a future algorithm can sit beside it. */
  algorithm: 'argon2id'
  /** Passes over memory (Argon2 "t"). */
  iterations: number
  /** Memory per derivation, in KiB (Argon2 "m"). */
  memoryKiB: number
  /** Lanes (Argon2 "p"). */
  parallelism: number
}

/** What new vaults use: Argon2id with 64 MiB, 3 passes, 4 lanes. */
export const DEFAULT_KDF: KdfParams = {
  algorithm: 'argon2id',
  iterations: 3,
  memoryKiB: 64 * 1024,
  parallelism: 4,
}

/**
 * The weakest and strongest settings the server accepts. The floors follow
 * OWASP's password storage guidance; the ceilings stop a client from making
 * an account that no browser can open in reasonable time.
 */
export const KDF_LIMITS = {
  iterations: { min: 2, max: 10 },
  memoryKiB: { min: 19 * 1024, max: 1024 * 1024 },
  parallelism: { min: 1, max: 16 },
} as const

function inRange(value: unknown, range: { min: number; max: number }) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= range.min &&
    value <= range.max
  )
}

/** The settings, copied field by field, or null if any is out of bounds. */
export function parseKdf(input: unknown): KdfParams | null {
  if (!input || typeof input !== 'object') return null
  const k = input as Record<string, unknown>
  if (
    k.algorithm !== 'argon2id' ||
    !inRange(k.iterations, KDF_LIMITS.iterations) ||
    !inRange(k.memoryKiB, KDF_LIMITS.memoryKiB) ||
    !inRange(k.parallelism, KDF_LIMITS.parallelism)
  ) {
    return null
  }
  return {
    algorithm: 'argon2id',
    iterations: k.iterations as number,
    memoryKiB: k.memoryKiB as number,
    parallelism: k.parallelism as number,
  }
}

/**
 * True if a vault's settings are weaker than DEFAULT_KDF, e.g. after the
 * defaults are raised in a future version. Such vaults are re-wrapped under
 * the new settings the next time they're unlocked.
 */
export function isOutdatedKdf(kdf: KdfParams) {
  return (
    kdf.algorithm !== DEFAULT_KDF.algorithm ||
    kdf.iterations < DEFAULT_KDF.iterations ||
    kdf.memoryKiB < DEFAULT_KDF.memoryKiB ||
    kdf.parallelism < DEFAULT_KDF.parallelism
  )
}
