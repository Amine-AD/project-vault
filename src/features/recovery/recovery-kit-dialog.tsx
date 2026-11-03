import { CheckIcon, CopyIcon, DownloadIcon, PrinterIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '#/components/ui/dialog'
import { useVault } from '#/context/VaultContext'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })

interface KitDetails {
  email: string
  recoveryKey: string
  origin: string
  createdAt: Date
}

function kitText({ email, recoveryKey, origin, createdAt }: KitDetails) {
  return [
    'ONEVAULT RECOVERY KIT',
    '=====================',
    '',
    `Account:  ${email}`,
    `Vault:    ${origin}`,
    `Created:  ${dateFormat.format(createdAt)}`,
    '',
    'Recovery key',
    recoveryKey,
    '',
    'If you forget your master password:',
    `  1. Go to ${origin}/recover`,
    '  2. Enter your email and this recovery key',
    '  3. Choose a new master password',
    'You will get a new recovery key afterwards. This one stops working.',
    '',
    'Keep this offline and private: printed in a safe place, or in a',
    'different password manager. Anyone with this key and your email can',
    'take over your vault. OneVault cannot see it or reset it for you.',
    '',
  ].join('\n')
}

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] ?? c,
  )
}

/** Prints a one-page kit through a hidden iframe (no popup needed). */
function printKit(details: KitDetails) {
  const { email, recoveryKey, origin, createdAt } = details
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) return iframe.remove()
  doc.open()
  doc.write(`<!doctype html><html><head><title>OneVault Recovery Kit</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; color: #111; margin: 48px; }
  h1 { font-size: 26px; margin: 0 0 4px; letter-spacing: -0.02em; }
  .muted { color: #555; }
  dl { display: grid; grid-template-columns: 90px 1fr; gap: 4px 12px; margin: 28px 0; }
  dt { color: #555; } dd { margin: 0; }
  .key { border: 2px solid #111; border-radius: 12px; padding: 20px; margin: 8px 0 28px;
         font: 600 22px/1.4 ui-monospace, Menlo, monospace; letter-spacing: 0.06em; text-align: center; }
  ol { padding-left: 20px; } .warn { border-top: 1px solid #ccc; padding-top: 16px; margin-top: 28px; }
</style></head><body>
<h1>OneVault Recovery Kit</h1>
<div class="muted">The only way back into your vault if you forget your master password.</div>
<dl>
  <dt>Account</dt><dd>${escapeHtml(email)}</dd>
  <dt>Vault</dt><dd>${escapeHtml(origin)}</dd>
  <dt>Created</dt><dd>${escapeHtml(dateFormat.format(createdAt))}</dd>
</dl>
<div class="muted">Recovery key</div>
<div class="key">${escapeHtml(recoveryKey)}</div>
<strong>If you forget your master password</strong>
<ol>
  <li>Go to ${escapeHtml(origin)}/recover</li>
  <li>Enter your email and this recovery key</li>
  <li>Choose a new master password. You'll get a new recovery key, and this one stops working.</li>
</ol>
<p class="warn muted">Keep this page private and offline. Anyone with this key and your email can take over
your vault. OneVault cannot see this key or reset it for you.</p>
</body></html>`)
  doc.close()

  const win = iframe.contentWindow
  if (!win) return iframe.remove()
  win.addEventListener('afterprint', () => iframe.remove())
  win.focus()
  win.print()
}

function downloadKit(details: KitDetails) {
  const blob = new Blob([kitText(details)], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'onevault-recovery-kit.txt'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Shown whenever a new recovery key is issued (sign-up, password change,
 * recovery, or a new kit from Settings). It can't be dismissed until the
 * user confirms they've saved the key, because it's never shown again.
 */
export function RecoveryKitDialog() {
  const { user, pendingRecoveryKey, dismissRecoveryKey } = useVault()
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const open = !!pendingRecoveryKey && !!user

  // A new key needs a fresh confirmation
  useEffect(() => {
    if (pendingRecoveryKey) setSaved(false)
  }, [pendingRecoveryKey])

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  if (!open) return null

  const details: KitDetails = {
    email: user.email,
    recoveryKey: pendingRecoveryKey,
    origin: window.location.origin,
    createdAt: new Date(),
  }
  const [prefix, ...groups] = pendingRecoveryKey.split('-')

  return (
    <Dialog
      closeOnEscape={false}
      closeOnInteractOutside={false}
      open={open}
      role="alertdialog"
    >
      <DialogContent showCloseButton={false} size="md">
        <DialogHeader
          title="Save your recovery kit"
          description="If you forget your master password, this key is the only way back into your vault. We can't see it or reset it, and it won't be shown again."
        />
        <DialogBody className="space-y-5">
          <div className="rounded-2xl border-2 border-foreground bg-card px-4 py-5 text-center">
            <div className="mb-2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.08em]">
              Recovery key · {user.email}
            </div>
            {/* Two even rows of four groups; select-all copies the whole key */}
            <p className="select-all font-mono font-semibold text-lg leading-relaxed tracking-[0.06em] sm:text-xl">
              <span className="block whitespace-nowrap">
                <span className="text-primary-ink">{prefix}</span>
                {groups.slice(0, 4).map((group) => (
                  <span key={group}>
                    <span className="text-muted-foreground">-</span>
                    {group}
                  </span>
                ))}
                <span className="text-muted-foreground">-</span>
              </span>
              <span className="block whitespace-nowrap">
                {groups.slice(4).map((group, index) => (
                  <span key={group}>
                    {index > 0 && (
                      <span className="text-muted-foreground">-</span>
                    )}
                    {group}
                  </span>
                ))}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => downloadKit(details)} variant="outline">
              <DownloadIcon />
              Download
            </Button>
            <Button onClick={() => printKit(details)} variant="outline">
              <PrinterIcon />
              Print
            </Button>
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(pendingRecoveryKey)
                setCopied(true)
              }}
              variant="outline"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <ul className="space-y-1.5 text-muted-foreground text-sm">
            <li>
              • Keep it offline: printed in a safe place, or in a different
              password manager.
            </li>
            <li>
              • Anyone with this key and your email can take over your vault.
            </li>
            <li>• Any older recovery key no longer works.</li>
          </ul>

          <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3.5">
            <Checkbox
              aria-label="I've saved my recovery key somewhere safe"
              checked={saved}
              className="mt-0.5"
              onCheckedChange={({ checked }) => setSaved(checked === true)}
            />
            <button
              className="text-start font-medium text-sm"
              onClick={() => setSaved((v) => !v)}
              type="button"
            >
              I've saved my recovery key somewhere safe
            </button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            className="px-6"
            disabled={!saved}
            onClick={dismissRecoveryKey}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
