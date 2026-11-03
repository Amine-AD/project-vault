import type React from 'react'
import { useId } from 'react'
import { PasswordStrength, passwordRules } from '#/components/PasswordStrength'
import {
  PasswordInput,
  PasswordInputGroup,
  PasswordInputInput,
  PasswordInputTrigger,
} from '#/components/ui/password-input'
import { MASTER_PASSWORD_MIN_LENGTH } from '../schemas'

/** Rules shown under new master passwords; the length matches validation. */
const MASTER_PASSWORD_RULES = passwordRules(MASTER_PASSWORD_MIN_LENGTH)

type MasterPasswordInputProps = Omit<
  React.ComponentProps<typeof PasswordInputInput>,
  'type' | 'value'
> & {
  value: string
  /**
   * Show the strength meter under the input. Use it where a password is
   * chosen (sign-up, recovery, change password), not where one is typed in.
   */
  strength?: boolean
  /** With `strength`, also list the requirements. */
  showRules?: boolean
}

/**
 * Shark's password input with a show/hide toggle, used for every master
 * password field. Sign-in and unlock use it plain; new passwords add
 * `strength`.
 */
export function MasterPasswordInput({
  strength = false,
  showRules = true,
  value,
  ...props
}: MasterPasswordInputProps) {
  const strengthId = useId()

  return (
    <>
      <PasswordInput>
        <PasswordInputGroup>
          <PasswordInputInput
            aria-describedby={strength ? strengthId : undefined}
            placeholder="Enter master password"
            spellCheck={false}
            value={value}
            {...props}
          />
          <PasswordInputTrigger aria-label="Toggle password visibility" />
        </PasswordInputGroup>
      </PasswordInput>
      {strength && (
        <PasswordStrength
          className="mt-1"
          id={strengthId}
          rules={MASTER_PASSWORD_RULES}
          showRules={showRules}
          value={value}
        />
      )}
    </>
  )
}
