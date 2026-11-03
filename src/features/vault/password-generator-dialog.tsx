import { CheckIcon, RefreshCwIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PasswordStrengthMeter } from '#/components/PasswordStrengthMeter'
import { SwitchField } from '#/components/SwitchField'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '#/components/ui/dialog'
import { Separator } from '#/components/ui/separator'
import { Slider, SliderLabel, SliderValue } from '#/components/ui/slider'
import { generatePassword, type PasswordGeneratorOptions } from '#/lib/crypto'
import {
  loadGeneratorDefaults,
  sameGeneratorOptions,
  saveGeneratorDefaults,
} from '#/lib/generator-preferences'
import { CopyButton } from './components/copy-button'

interface PasswordGeneratorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ToggleKey = Exclude<keyof PasswordGeneratorOptions, 'length'>

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: 'uppercase', label: 'Uppercase (A–Z)' },
  { key: 'lowercase', label: 'Lowercase (a–z)' },
  { key: 'numbers', label: 'Numbers (0–9)' },
  { key: 'symbols', label: 'Symbols (!@#$)' },
  { key: 'avoidAmbiguous', label: 'Avoid look-alikes (0, O, 1, l)' },
]

export function PasswordGeneratorDialog({
  open,
  onOpenChange,
}: PasswordGeneratorDialogProps) {
  const [options, setOptions] = useState<PasswordGeneratorOptions>(
    loadGeneratorDefaults,
  )
  const [defaults, setDefaults] = useState<PasswordGeneratorOptions>(
    loadGeneratorDefaults,
  )
  const [password, setPassword] = useState('')
  const isDefault = sameGeneratorOptions(options, defaults)

  // Start from the saved defaults each time the dialog opens
  useEffect(() => {
    if (!open) return
    const saved = loadGeneratorDefaults()
    setDefaults(saved)
    setOptions(saved)
  }, [open])

  useEffect(() => {
    if (open) setPassword(generatePassword(options))
  }, [open, options])

  return (
    <Dialog open={open} onOpenChange={({ open }) => onOpenChange(open)}>
      <DialogContent size="sm">
        <DialogHeader
          title="Password generator"
          description="Random, generated locally with your browser's secure RNG."
        />
        <DialogBody className="space-y-5">
          <div className="space-y-3 rounded-2xl border bg-background p-4">
            <p className="select-text break-all text-center font-mono font-semibold text-lg tracking-wide">
              {password}
            </p>
            <PasswordStrengthMeter password={password} />
          </div>

          <Slider
            max={64}
            min={8}
            onValueChange={({ value }) =>
              setOptions((o) => ({ ...o, length: value[0] }))
            }
            value={[options.length]}
          >
            <div className="flex items-center">
              <SliderLabel>Length</SliderLabel>
              <SliderValue />
            </div>
          </Slider>

          <Separator />

          <div className="space-y-3">
            {TOGGLES.map(({ key, label }) => (
              <SwitchField
                checked={options[key]}
                key={key}
                label={label}
                onCheckedChange={(checked) =>
                  setOptions((o) => ({ ...o, [key]: checked }))
                }
              />
            ))}
          </div>

          {/* Defaults also seed the password of every new login */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 py-2 ps-3.5 pe-2 text-sm">
            <span className="text-muted-foreground">
              {isDefault
                ? 'These are your defaults.'
                : 'Use these for new logins too?'}
            </span>
            <Button
              disabled={isDefault}
              onClick={() => {
                saveGeneratorDefaults(options)
                setDefaults(options)
              }}
              size="sm"
              variant={isDefault ? 'ghost' : 'outline'}
            >
              {isDefault ? (
                <>
                  <CheckIcon />
                  Saved
                </>
              ) : (
                'Save as default'
              )}
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            onClick={() => setPassword(generatePassword(options))}
            variant="outline"
          >
            <RefreshCwIcon />
            Regenerate
          </Button>
          <CopyButton
            label="Copy password"
            size="md"
            value={password}
            variant="default"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
