import { useEffect, useMemo, useState } from 'react'
import { cn } from '#/lib/utils'

/**
 * Segmented password strength meter with a requirement checklist.
 *
 * The score is the number of rules met (at least 1 once something is typed),
 * dropped to 1 for commonly guessed patterns. One segment per rule, filled
 * left to right with a slight spring; the label crossfades between levels.
 * Animations are CSS transitions and switch off for reduced motion.
 */

export interface PasswordRule {
  id: string
  label: string
  test: (value: string) => boolean
}

const COMMON =
  /^(?:password|passw0rd|qwerty|letmein|welcome|admin|iloveyou|monkey|dragon|abc123|111111|123123|123456)/i
const REPEATED = /(.)\1{3,}/
const SEQUENCE =
  /(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|qwer|wert|erty|asdf)/i
const SYMBOL = /[!-/:-@[-`{-~]/

/** Length, mixed case, a number and a symbol. */
export function passwordRules(minLength: number): PasswordRule[] {
  return [
    {
      id: 'length',
      label: `${minLength} characters or more`,
      test: (v) => v.length >= minLength,
    },
    {
      id: 'case',
      label: 'Upper and lower case',
      test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v),
    },
    { id: 'digit', label: 'A number', test: (v) => /\d/.test(v) },
    { id: 'symbol', label: 'A symbol', test: (v) => SYMBOL.test(v) },
  ]
}

const LABELS = ['Empty', 'Weak', 'Fair', 'Good', 'Strong'] as const

export function usePasswordStrength(
  value: string,
  rules: readonly PasswordRule[],
  announceDelay = 700,
) {
  const state = useMemo(() => {
    const evaluated = rules.map((rule) => ({ ...rule, met: rule.test(value) }))
    const passed = evaluated.filter((rule) => rule.met).length
    const guessable =
      value.length > 0 &&
      (COMMON.test(value) || REPEATED.test(value) || SEQUENCE.test(value))
    const score =
      value.length === 0
        ? 0
        : guessable
          ? 1
          : Math.min(rules.length, Math.max(1, passed))
    const label = LABELS[Math.min(score, LABELS.length - 1)]
    const unmet = evaluated.filter((rule) => !rule.met)

    const announcement =
      value.length === 0
        ? ''
        : [
            `Password strength ${label.toLowerCase()}.`,
            guessable ? 'This is a commonly guessed pattern.' : '',
            unmet.length === 0
              ? 'All requirements met.'
              : `Still needed: ${unmet.map((r) => r.label.toLowerCase()).join(', ')}.`,
          ]
            .filter(Boolean)
            .join(' ')

    return {
      score,
      max: rules.length,
      label,
      evaluated,
      guessable,
      announcement,
    }
  }, [value, rules])

  // Screen readers hear the result once typing pauses, not every keystroke
  const [spoken, setSpoken] = useState('')
  useEffect(() => {
    if (!state.announcement) return setSpoken('')
    const timeout = setTimeout(
      () => setSpoken(state.announcement),
      announceDelay,
    )
    return () => clearTimeout(timeout)
  }, [state.announcement, announceDelay])

  return { ...state, announcement: spoken }
}

const TONES = {
  none: { bar: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
  danger: { bar: 'bg-destructive', text: 'text-destructive-foreground' },
  caution: { bar: 'bg-warning', text: 'text-warning-foreground' },
  safe: { bar: 'bg-success', text: 'text-success-foreground' },
} as const

function toneFor(score: number, max: number) {
  if (score === 0) return TONES.none
  const ratio = score / max
  if (ratio <= 0.34) return TONES.danger
  if (ratio <= 0.67) return TONES.caution
  return TONES.safe
}

/** Slight overshoot, close to the reference's spring. */
const SPRING = 'ease-[cubic-bezier(0.3,1.35,0.5,1)]'

interface PasswordStrengthProps {
  value: string
  rules: readonly PasswordRule[]
  /** Show the requirement checklist under the meter. */
  showRules?: boolean
  id?: string
  className?: string
}

export function PasswordStrength({
  value,
  rules,
  showRules = true,
  id,
  className,
}: PasswordStrengthProps) {
  const { score, max, label, evaluated, guessable, announcement } =
    usePasswordStrength(value, rules)
  const tone = toneFor(score, max)

  return (
    <div
      className={cn('w-full', className)}
      data-slot="password-strength"
      id={id}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: a native <meter> cannot draw separate segments */}
      <div
        aria-label="Password strength"
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={score}
        aria-valuetext={label}
        className="grid gap-1.5"
        role="meter"
        style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: max }, (_, i) => (
          <div
            className="relative h-1.5 overflow-hidden rounded-full bg-muted dark:bg-white/10"
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed set of segments
            key={i}
          >
            <span
              className={cn(
                'absolute inset-0 origin-left rounded-full transition-[transform,background-color] duration-[420ms,200ms] motion-reduce:transition-none',
                SPRING,
                tone.bar,
              )}
              style={{
                transform: `scaleX(${i < score ? 1 : 0})`,
                // Stagger only while filling, so emptying reads as one motion
                transitionDelay: i < score ? `${i * 30}ms` : '0ms',
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex h-5 items-center justify-between gap-3">
        {/* Every label shares one cell, so the widest sets the width once */}
        <span className="inline-grid font-medium text-[12.5px] leading-5">
          {LABELS.map((text, i) => (
            <span
              aria-hidden
              className={cn(
                'col-start-1 row-start-1 whitespace-nowrap transition-[opacity,color] duration-300 motion-reduce:transition-none',
                tone.text,
                i === Math.min(score, LABELS.length - 1)
                  ? 'opacity-100'
                  : 'opacity-0',
              )}
              key={text}
            >
              {text}
            </span>
          ))}
        </span>
        <span
          aria-hidden
          className={cn(
            'whitespace-nowrap text-[11.5px] text-warning-foreground leading-5 transition-opacity duration-300 motion-reduce:transition-none',
            guessable ? 'opacity-100' : 'opacity-0',
          )}
        >
          Commonly guessed
        </span>
      </div>

      {showRules && (
        <ul className="mt-2.5 grid gap-1.5">
          {evaluated.map((rule) => (
            <li className="flex items-center gap-2" key={rule.id}>
              <span className="relative grid size-3.5 shrink-0 place-items-center rounded-[4px] border border-input text-white dark:text-brand-ink">
                <span
                  className={cn(
                    'absolute -inset-px rounded-[4px] bg-success transition-opacity duration-300 motion-reduce:transition-none',
                    rule.met ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <svg
                  aria-hidden
                  className={cn(
                    'relative size-[9px] transition-[opacity,transform] duration-300 motion-reduce:transition-none',
                    SPRING,
                    rule.met ? 'scale-100 opacity-100' : 'scale-60 opacity-0',
                  )}
                  fill="none"
                  viewBox="0 0 12 12"
                >
                  <path
                    d="M2 6.2 4.7 8.9 10 3.3"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.9}
                  />
                </svg>
              </span>
              <span
                className={cn(
                  'text-[12.5px] leading-5 transition-colors duration-200',
                  rule.met ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {rule.label}
              </span>
              <span className="sr-only">{rule.met ? 'met' : 'not met'}</span>
            </li>
          ))}
        </ul>
      )}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
