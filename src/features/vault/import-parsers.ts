import type { CustomField, DecryptedItem, LoginItem } from '#/types/vault'

/**
 * Splits CSV text into rows of cells (RFC 4180): commas inside quotes, quotes
 * escaped by doubling them, and line breaks inside quoted values (multi-line
 * notes) all stay in their cell.
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  const endCell = () => {
    row.push(cell)
    cell = ''
  }
  const endRow = () => {
    endCell()
    if (row.some((value) => value.trim().length > 0)) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell.trim() === '') {
      // A quote only opens a quoted value at the start of a cell; elsewhere
      // (hand-made files) it's an ordinary character
      cell = ''
      inQuotes = true
    } else if (char === ',') {
      endCell()
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      endRow()
    } else {
      cell += char
    }
  }
  if (cell.length > 0 || row.length > 0) endRow()
  return rows
}

type Field =
  | 'title'
  | 'username'
  | 'password'
  | 'url'
  | 'notes'
  | 'totp'
  | 'type'

/**
 * Column names used by each exporter, most specific first: 1Password
 * (Title, Url, Username, Password, OTPAuth, Notes), Bitwarden (name,
 * login_uri, login_username, login_password, login_totp, notes, type),
 * LastPass (name, url, username, password, totp, extra) and Chrome / Edge /
 * Firefox (name, url, username, password, note).
 */
const COLUMN_NAMES: Record<Field, string[]> = {
  password: ['password', 'login_password'],
  totp: ['otpauth', 'login_totp', 'totp', 'one-time password', 'otp'],
  url: ['url', 'login_uri', 'website', 'uri', 'web site', 'origin'],
  username: [
    'username',
    'login_username',
    'user name',
    'login',
    'email',
    'user',
  ],
  notes: ['notes', 'note', 'extra', 'comments', 'comment'],
  title: ['title', 'name'],
  type: ['type'],
}

/** Loose matches for hand-made CSVs, tried after the exact names. */
const COLUMN_HINTS: Partial<Record<Field, string[]>> = {
  password: ['password'],
  url: ['url', 'uri', 'website'],
  username: ['username', 'email'],
  notes: ['note'],
  title: ['title'],
}

/**
 * Which column holds each field. Exact names are matched first for every
 * field, so e.g. Bitwarden's "login_uri" can't be taken for the username
 * just because it contains "login". A column is used for one field only.
 */
function mapColumns(headers: string[]): Partial<Record<Field, number>> {
  const normalized = headers.map((h) => h.replace(/^﻿/, '').trim().toLowerCase())
  const taken = new Set<number>()
  const map: Partial<Record<Field, number>> = {}
  const fields = Object.keys(COLUMN_NAMES) as Field[]

  const claim = (field: Field, index: number) => {
    map[field] = index
    taken.add(index)
  }

  for (const field of fields) {
    for (const name of COLUMN_NAMES[field]) {
      const index = normalized.findIndex((h, i) => h === name && !taken.has(i))
      if (index >= 0) {
        claim(field, index)
        break
      }
    }
  }
  for (const field of fields) {
    if (map[field] !== undefined) continue
    for (const hint of COLUMN_HINTS[field] ?? []) {
      const index = normalized.findIndex(
        (h, i) => h.includes(hint) && !taken.has(i),
      )
      if (index >= 0) {
        claim(field, index)
        break
      }
    }
  }
  return map
}

/** The base32 secret from an otpauth:// URI, or the value as typed. */
export function totpSecretFrom(value: string): string {
  const trimmed = value.trim()
  if (!/^otpauth:\/\//i.test(trimmed)) return trimmed
  try {
    return new URL(trimmed).searchParams.get('secret')?.trim() ?? ''
  } catch {
    return ''
  }
}

/** Parses CSV exports from 1Password, Bitwarden, LastPass or a browser. */
export function parseCsv(csvText: string): Partial<DecryptedItem>[] {
  const rows = parseCsvRows(csvText)
  if (rows.length < 2) return []

  const columns = mapColumns(rows[0])
  const cell = (row: string[], field: Field) => {
    const index = columns[field]
    return index === undefined ? '' : (row[index] ?? '').trim()
  }

  return rows.slice(1).map((row): Partial<DecryptedItem> => {
    const title = cell(row, 'title')
    const notes = cell(row, 'notes')
    // Bitwarden marks secure notes with type "note"
    if (cell(row, 'type').toLowerCase() === 'note') {
      return {
        type: 'note',
        title: title || 'Imported note',
        notes,
        tags: ['imported'],
        isFavorite: false,
      }
    }
    return {
      type: 'login',
      title: title || 'Imported login',
      username: cell(row, 'username'),
      password: cell(row, 'password'),
      url: cell(row, 'url'),
      totpSecret: totpSecretFrom(cell(row, 'totp')),
      notes,
      tags: ['imported'],
      isFavorite: false,
    }
  })
}

const MAX_TEXT = 100_000

function text(value: unknown, max = MAX_TEXT): string {
  if (typeof value === 'string') return value.slice(0, max)
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

function customFields(value: unknown): CustomField[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry): CustomField[] => {
    if (!entry || typeof entry !== 'object') return []
    const f = entry as Record<string, unknown>
    return [
      {
        id: crypto.randomUUID(),
        name: text(f.name, 200),
        value: text(f.value),
        type: f.type === 'hidden' ? 'hidden' : 'text',
      },
    ]
  })
}

/**
 * One item from a JSON file, with every field checked and turned into the
 * type the app expects. A file edited by hand (or made by another tool)
 * could otherwise store a number as a title and break search.
 */
function sanitizeItem(value: unknown): Partial<DecryptedItem> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  const base = {
    title: text(v.title, 500),
    notes: text(v.notes),
    customFields: customFields(v.customFields),
    tags: Array.isArray(v.tags)
      ? v.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim().slice(0, 50))
          .filter(Boolean)
          .slice(0, 50)
      : [],
    isFavorite: v.isFavorite === true,
  }
  if (v.type === 'note') return { ...base, type: 'note' }
  const login: Partial<LoginItem> = {
    ...base,
    type: 'login',
    username: text(v.username, 1000),
    password: text(v.password, 10_000),
    url: text(v.url, 2000),
    totpSecret: totpSecretFrom(text(v.totpSecret, 1000)),
  }
  return login
}

/** Parses a OneVault JSON export (array of items or `{ items: [...] }`). */
export function parseJson(jsonText: string): Partial<DecryptedItem>[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('This file isn’t valid JSON.')
  }
  const items = Array.isArray(parsed)
    ? parsed
    : (parsed as { items?: unknown } | null)?.items
  if (!Array.isArray(items)) {
    throw new Error(
      'Unrecognized JSON. Expected an array of items or { items: [...] }.',
    )
  }
  const valid = items.map(sanitizeItem).filter((item) => item !== null)
  if (valid.length === 0) throw new Error('No items found in this file.')
  return valid
}

export async function parseImportFile(
  file: File,
): Promise<Partial<DecryptedItem>[]> {
  const text = await file.text()
  const name = file.name.toLowerCase()
  if (name.endsWith('.json')) return parseJson(text)
  if (name.endsWith('.csv')) {
    const items = parseCsv(text)
    if (items.length === 0) throw new Error('No items found in this CSV file.')
    return items
  }
  throw new Error('Unsupported file. Choose a .csv or .json file.')
}
