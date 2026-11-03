import { FileTextIcon } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { ItemType } from '#/types/vault'
import { getHostname } from '../utils'

const SIZES = {
  sm: 'size-10 rounded-xl text-base [&_svg]:size-4',
  lg: 'size-14 rounded-2xl text-2xl [&_svg]:size-6',
} as const

/**
 * Brand-adjacent tile colors. Each login gets one picked from its name, so
 * the same site always has the same tile.
 */
const TILES = [
  'bg-primary text-white',
  'bg-brand-lime text-brand-ink',
  'bg-brand-ink text-brand-lime dark:bg-[#2a2a2e]',
  'bg-[#ff6b4a] text-white',
  'bg-[#8ec5ff] text-brand-ink',
  'bg-[#3ccf91] text-brand-ink',
  'bg-[#ffb020] text-brand-ink',
  'bg-[#c9b6ff] text-brand-ink',
] as const

function hash(text: string) {
  let h = 0
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) | 0
  return Math.abs(h)
}

/** "github.com" → "github", "accounts.google.co.uk" → "google". */
function siteName(url: string) {
  const parts = getHostname(url)
    .replace(/^www\./, '')
    .split('.')
  if (parts.length <= 2) return parts[0]
  // Country domains like co.uk / com.au put the name one level further left
  const tld = parts[parts.length - 1]
  const sld = parts[parts.length - 2]
  const isCountrySld = tld.length === 2 && COUNTRY_SLDS.has(sld)
  return isCountrySld ? parts[parts.length - 3] : sld
}

const COUNTRY_SLDS = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu'])

interface ItemIconProps {
  type: ItemType
  title?: string
  url?: string
  size?: keyof typeof SIZES
  className?: string
}

/**
 * Item tile: a colored monogram for logins (from the site, else the title)
 * and a paper sheet for notes. Built locally on purpose: fetching favicons
 * would tell a third party which sites are in the vault.
 */
export function ItemIcon({
  type,
  title = '',
  url,
  size = 'sm',
  className,
}: ItemIconProps) {
  const base = cn(
    'flex shrink-0 select-none items-center justify-center',
    SIZES[size],
    className,
  )

  if (type === 'note') {
    return (
      <span
        aria-hidden
        className={cn(base, 'border bg-card text-muted-foreground')}
      >
        <FileTextIcon />
      </span>
    )
  }

  const name = (url && siteName(url)) || title.trim()
  const letter = name.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase()

  return (
    <span
      aria-hidden
      className={cn(
        base,
        'font-display font-bold leading-none',
        letter ? TILES[hash(name.toLowerCase()) % TILES.length] : 'bg-muted',
      )}
    >
      {letter ?? '•'}
    </span>
  )
}
