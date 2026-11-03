import { getPasswordStrength } from '#/lib/crypto'

const SEGMENTS = [0, 1, 2, 3]

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null

  const { score, label, color } = getPasswordStrength(password)

  return (
    <div className="flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-0.5 h-1 rounded-full overflow-hidden bg-muted">
        {SEGMENTS.map((step) => (
          <div
            key={step}
            className="flex-1 h-full transition-colors"
            style={{ backgroundColor: step < score ? color : 'transparent' }}
          />
        ))}
      </div>
      <span className="text-xs font-medium" style={{ color }}>
        {label}
      </span>
    </div>
  )
}
