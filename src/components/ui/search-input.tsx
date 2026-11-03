import { SearchIcon } from 'lucide-react'
import type React from 'react'
import { cn } from '@/lib/utils'
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group'

export interface SearchInputProps
  extends Omit<React.ComponentProps<typeof InputGroupInput>, 'type'> {
  /** Class name applied to the input-group container. */
  containerClassName?: string
  /** Replaces the leading search icon. */
  icon?: React.ReactNode
  /** Content rendered at the end of the input group, such as a clear button. */
  trailingAction?: React.ReactNode
}

export function SearchInput({
  className,
  containerClassName,
  icon = <SearchIcon aria-hidden />,
  placeholder = 'Search...',
  trailingAction,
  ...props
}: SearchInputProps) {
  return (
    <InputGroup className={cn('w-full max-w-64', containerClassName)}>
      <InputGroupAddon aria-hidden>{icon}</InputGroupAddon>
      <InputGroupInput
        className={className}
        placeholder={placeholder}
        type="search"
        {...props}
      />
      {trailingAction && (
        <InputGroupAddon align="inline-end">{trailingAction}</InputGroupAddon>
      )}
    </InputGroup>
  )
}
