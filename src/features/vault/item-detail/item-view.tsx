import {
  EllipsisIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  StarIcon,
  StarOffIcon,
  TimerIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from '#/components/ui/menu'
import { Progress } from '#/components/ui/progress'
import { useVault } from '#/context/VaultContext'
import { cn } from '#/lib/utils'
import type { DecryptedItem, LoginItem } from '#/types/vault'
import { ItemIcon } from '../components/item-icon'
import { formatTotp, useTotp } from '../hooks/use-totp'
import { getHostname, toAbsoluteUrl } from '../utils'
import { CredentialGroup, CredentialRow, SectionLabel } from './credential-row'

const MASK = '••••••••••••'

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function ItemView({ item }: { item: DecryptedItem }) {
  const { setIsEditing, toggleFavorite, setSelectedTag } = useVault()
  const [revealed, setRevealed] = useState(false)
  const login = item.type === 'login' ? item : null
  const hasCustomFields = !!item.customFields?.length
  const site = login?.url ? getHostname(login.url) : null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-6 md:p-10">
      <header className="flex items-start gap-4">
        <ItemIcon
          size="lg"
          title={item.title}
          type={item.type}
          url={login?.url}
        />
        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
          <div className="flex items-center gap-1">
            <h1 className="truncate font-display font-semibold text-2xl tracking-[-0.02em] md:text-[1.75rem]">
              {item.title || 'Untitled'}
            </h1>
            <Button
              aria-label={
                item.isFavorite ? 'Remove from favorites' : 'Add to favorites'
              }
              aria-pressed={item.isFavorite}
              className={cn(
                'shrink-0',
                item.isFavorite ? 'text-warning' : 'text-muted-foreground',
              )}
              onClick={() => toggleFavorite(item.id)}
              size="icon-sm"
              variant="ghost"
            >
              <StarIcon fill={item.isFavorite ? 'currentColor' : 'none'} />
            </Button>
          </div>
          <p className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
              {item.type === 'login' ? 'Login' : 'Secure note'}
            </span>
            {site && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{site}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <PencilIcon />
            Edit
          </Button>
          <ItemMenu item={item} />
        </div>
      </header>

      {login && (
        <LoginFields
          item={login}
          revealed={revealed}
          onToggleReveal={() => setRevealed((v) => !v)}
        />
      )}

      {hasCustomFields && (
        <section className="space-y-2.5">
          <SectionLabel>Custom fields</SectionLabel>
          <CredentialGroup>
            {item.customFields?.map((field) => (
              <CredentialRow
                copyLabel={`Copy ${field.name || 'field'}`}
                copyValue={field.value}
                key={field.id}
                label={field.name || 'Custom field'}
                mono={field.type === 'hidden'}
              >
                {field.type === 'hidden' && !revealed
                  ? MASK
                  : field.value || '—'}
              </CredentialRow>
            ))}
          </CredentialGroup>
        </section>
      )}

      {item.notes && (
        <section className="space-y-2.5">
          <SectionLabel>Notes</SectionLabel>
          <div className="select-text whitespace-pre-wrap rounded-2xl border bg-card px-5 py-4 text-[0.9375rem] leading-relaxed shadow-xs/5">
            {item.notes}
          </div>
        </section>
      )}

      {item.tags.length > 0 && (
        <section className="space-y-2.5">
          <SectionLabel>Tags</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge
                asChild
                className="cursor-pointer hover:bg-muted"
                key={tag}
                pill
                size="lg"
                variant="outline"
              >
                <button
                  onClick={() => setSelectedTag(tag)}
                  title={`Show items tagged ${tag}`}
                  type="button"
                >
                  #{tag}
                </button>
              </Badge>
            ))}
          </div>
        </section>
      )}

      <p className="border-t pt-4 text-muted-foreground text-xs">
        Updated {dateTime.format(item.updatedAt)}
        <span aria-hidden className="mx-2">
          ·
        </span>
        Created {dateTime.format(item.createdAt)}
      </p>
    </div>
  )
}

/** Less frequent actions, with Delete kept out of easy mis-click range. */
function ItemMenu({ item }: { item: DecryptedItem }) {
  const { toggleFavorite, removeItem } = useVault()
  const url = item.type === 'login' ? item.url : undefined

  return (
    <Menu positioning={{ placement: 'bottom-end' }}>
      <MenuTrigger asChild>
        <Button aria-label="More actions" size="icon-md" variant="outline">
          <EllipsisIcon />
        </Button>
      </MenuTrigger>
      <MenuContent className="w-52">
        <MenuItem onSelect={() => toggleFavorite(item.id)} value="favorite">
          {item.isFavorite ? <StarOffIcon /> : <StarIcon />}
          {item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        </MenuItem>
        {url && (
          <MenuItem asChild value="open">
            <a
              href={toAbsoluteUrl(url)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLinkIcon />
              Open website
            </a>
          </MenuItem>
        )}
        <MenuSeparator />
        <MenuItem
          onSelect={() => removeItem(item.id)}
          value="delete"
          variant="destructive"
        >
          <Trash2Icon />
          Delete
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

function LoginFields({
  item,
  revealed,
  onToggleReveal,
}: {
  item: LoginItem
  revealed: boolean
  onToggleReveal: () => void
}) {
  const hasAny = item.username || item.password || item.url || item.totpSecret
  if (!hasAny) return null

  return (
    <CredentialGroup>
      {item.username && (
        <CredentialRow
          copyLabel="Copy username"
          copyValue={item.username}
          label="Username"
        >
          {item.username}
        </CredentialRow>
      )}

      {item.password && (
        <CredentialRow
          actions={
            <Button
              aria-label={revealed ? 'Hide password' : 'Show password'}
              onClick={onToggleReveal}
              size="icon-sm"
              variant="ghost"
            >
              {revealed ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          }
          copyLabel="Copy password"
          copyValue={item.password}
          label="Password"
          mono
        >
          {revealed ? item.password : MASK}
        </CredentialRow>
      )}

      {item.totpSecret && <TotpRow secret={item.totpSecret} />}

      {item.url && (
        <CredentialRow
          actions={
            <Button
              asChild
              aria-label="Open website"
              size="icon-sm"
              variant="ghost"
            >
              <a
                href={toAbsoluteUrl(item.url)}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLinkIcon />
              </a>
            </Button>
          }
          copyLabel="Copy website"
          copyValue={item.url}
          label="Website"
        >
          <span className="text-primary-ink">{item.url}</span>
        </CredentialRow>
      )}
    </CredentialGroup>
  )
}

function TotpRow({ secret }: { secret: string }) {
  const { code, seconds, period } = useTotp(secret)
  const isExpiring = seconds <= 5

  return (
    <CredentialRow
      actions={
        <span
          className={cn(
            'w-8 text-end font-mono text-muted-foreground text-xs tabular-nums',
            isExpiring && 'text-destructive',
          )}
        >
          {seconds}s
        </span>
      }
      copyLabel="Copy one-time code"
      copyValue={code ?? undefined}
      footer={
        <Progress
          aria-label="Time until the code changes"
          className={cn(
            'mt-1.5 max-w-40 [&_[data-slot=progress-track]]:h-1',
            isExpiring && '[&_[data-slot=progress-indicator]]:bg-destructive',
          )}
          max={period}
          value={seconds}
        />
      }
      label={
        <>
          <TimerIcon className="size-3.5" />
          One-time code
        </>
      }
      mono
    >
      <span className="font-semibold text-xl tracking-[0.12em]">
        {code ? formatTotp(code) : 'Invalid secret'}
      </span>
    </CredentialRow>
  )
}
