import type { DecryptedItem } from '#/types/vault'

export function toAbsoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function getHostname(url: string): string {
  try {
    return new URL(toAbsoluteUrl(url)).hostname
  } catch {
    return url
  }
}

export function getItemSubtitle(item: DecryptedItem): string {
  if (item.type === 'login') {
    return (
      item.username || (item.url ? getHostname(item.url) : '') || 'No username'
    )
  }
  return item.notes?.slice(0, 40) || 'Empty note'
}

export function downloadJson(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function todayStamp() {
  return new Date().toISOString().split('T')[0]
}
