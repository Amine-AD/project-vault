import { CheckIcon, CopyIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, type ButtonProps } from '#/components/ui/button'
import { useVault } from '#/context/VaultContext'

interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  value: string
  label?: string
  /** Render only the icon. */
  iconOnly?: boolean
}

/**
 * Copies through the vault so the clipboard auto-clear setting is respected.
 */
export function CopyButton({
  value,
  label = 'Copy',
  iconOnly = false,
  variant = 'outline',
  size = iconOnly ? 'icon-sm' : 'sm',
  ...rest
}: CopyButtonProps) {
  const { copySecureText } = useVault()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  const Icon = copied ? CheckIcon : CopyIcon

  return (
    <Button
      aria-label={iconOnly ? label : undefined}
      disabled={!value}
      onClick={async () => {
        await copySecureText(value)
        setCopied(true)
      }}
      size={size}
      title={iconOnly ? label : undefined}
      variant={variant}
      {...rest}
    >
      <Icon className={copied ? 'text-success' : undefined} />
      {!iconOnly && <span>{copied ? 'Copied' : label}</span>}
    </Button>
  )
}
