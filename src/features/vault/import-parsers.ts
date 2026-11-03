import type { DecryptedItem, LoginItem } from '#/types/vault'

/** Splits one CSV line, honouring quoted values and escaped quotes. */
function parseCsvLine(text: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/** Parses CSV exports from 1Password, Bitwarden, LastPass or Chrome. */
export function parseCsv(csvText: string): Partial<LoginItem>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const find = (...keys: string[]) =>
    headers.findIndex((h) => keys.some((k) => h.includes(k)))
  const titleIdx = find('title', 'name')
  const userIdx = find('user', 'login', 'email')
  const passIdx = find('pass')
  const urlIdx = find('url', 'website')
  const notesIdx = find('note')
  const col = (cols: string[], idx: number) =>
    idx >= 0 ? (cols[idx] ?? '') : ''

  return lines.slice(1).flatMap((line) => {
    const cols = parseCsvLine(line)
    if (!cols.some((c) => c.length > 0)) return []
    return [
      {
        type: 'login' as const,
        title: col(cols, titleIdx) || 'Imported login',
        username: col(cols, userIdx),
        password: col(cols, passIdx),
        url: col(cols, urlIdx),
        notes: col(cols, notesIdx),
        tags: ['imported'],
        isFavorite: false,
      },
    ]
  })
}

/** Parses a OneVault JSON export (array of items or `{ items: [...] }`). */
export function parseJson(jsonText: string): Partial<DecryptedItem>[] {
  const parsed = JSON.parse(jsonText)
  const items = Array.isArray(parsed) ? parsed : parsed?.items
  if (!Array.isArray(items)) {
    throw new Error(
      'Unrecognized JSON. Expected an array of items or { items: [...] }.',
    )
  }
  return items
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
