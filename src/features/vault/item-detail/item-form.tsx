import { PlusIcon, SparklesIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { PasswordStrengthMeter } from '#/components/PasswordStrengthMeter'
import { Button } from '#/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import {
  PasswordInput,
  PasswordInputGroup,
  PasswordInputInput,
  PasswordInputTrigger,
} from '#/components/ui/password-input'
import { TagsInput, TagsInputItem } from '#/components/ui/tags-input'
import { Textarea } from '#/components/ui/textarea'
import { useVault } from '#/context/VaultContext'
import { generatePassword } from '#/lib/crypto'
import { loadGeneratorDefaults } from '#/lib/generator-preferences'
import type { CustomField, DecryptedItem, ItemType } from '#/types/vault'
import { ItemIcon } from '../components/item-icon'
import { formatTotp, useTotp } from '../hooks/use-totp'
import { SectionLabel } from './credential-row'

interface ItemFormProps {
  /** The item being edited, or undefined when creating. */
  item?: DecryptedItem
  type: ItemType
}

export function ItemForm({ item, type }: ItemFormProps) {
  const { saveItem, setIsEditing, setIsCreating } = useVault()
  const login = item?.type === 'login' ? item : undefined
  const isNew = !item

  const [title, setTitle] = useState(item?.title ?? '')
  const [username, setUsername] = useState(login?.username ?? '')
  const [password, setPassword] = useState(
    login?.password ??
      (isNew && type === 'login'
        ? generatePassword(loadGeneratorDefaults())
        : ''),
  )
  const [url, setUrl] = useState(login?.url ?? '')
  const [totpSecret, setTotpSecret] = useState(login?.totpSecret ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [tags, setTags] = useState<string[]>(item?.tags ?? [])
  const [customFields, setCustomFields] = useState<CustomField[]>(
    item?.customFields ?? [],
  )
  const [isSaving, setIsSaving] = useState(false)
  const totp = useTotp(totpSecret.trim() || undefined)

  const cancel = () => {
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload: Record<string, unknown> = {
        id: item?.id,
        type,
        title: title.trim() || 'Untitled',
        notes: notes.trim(),
        tags,
        customFields,
        isFavorite: item?.isFavorite ?? false,
        createdAt: item?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      }
      if (type === 'login') {
        Object.assign(payload, {
          username: username.trim(),
          password,
          url: url.trim(),
          totpSecret: totpSecret.trim(),
        })
      }
      await saveItem(payload as Partial<DecryptedItem>)
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (id: string, updates: Partial<CustomField>) =>
    setCustomFields((fields) =>
      fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    )

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-8 px-6 pb-10 md:px-10"
    >
      {/* Sticky so Save stays in reach on long forms */}
      <header className="sticky top-0 z-10 -mx-6 flex items-center justify-between gap-4 border-b bg-background/85 px-6 py-4 backdrop-blur-md md:-mx-10 md:px-10 md:pt-8">
        <div className="flex min-w-0 items-center gap-4">
          <ItemIcon
            size="lg"
            title={title}
            type={type}
            url={type === 'login' ? url : undefined}
          />
          <div className="min-w-0">
            <h1 className="truncate font-display font-semibold text-xl tracking-[-0.02em] md:text-2xl">
              {isNew
                ? type === 'login'
                  ? 'New login'
                  : 'New secure note'
                : `Edit ${item.title || 'item'}`}
            </h1>
            <p className="text-muted-foreground text-sm">
              Encrypted before it's saved.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button onClick={cancel} variant="ghost">
            Cancel
          </Button>
          <Button className="px-5" isLoading={isSaving} type="submit">
            Save
          </Button>
        </div>
      </header>

      <FieldGroup>
        <Field required>
          <FieldLabel>Title</FieldLabel>
          <Input
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. GitHub, Google, Wi-Fi"
            size="lg"
            value={title}
          />
        </Field>

        {type === 'login' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Username or email</FieldLabel>
                <Input
                  autoComplete="off"
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="you@example.com"
                  value={username}
                />
              </Field>
              <Field>
                <FieldLabel>Website</FieldLabel>
                <Input
                  inputMode="url"
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="github.com"
                  value={url}
                />
              </Field>
            </div>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel>Password</FieldLabel>
                <Button
                  className="-me-2 h-7"
                  onClick={() =>
                    setPassword(generatePassword(loadGeneratorDefaults()))
                  }
                  size="sm"
                  title="Uses your generator defaults"
                  variant="ghost"
                >
                  <SparklesIcon />
                  Generate
                </Button>
              </div>
              <PasswordInput defaultVisible={isNew}>
                <PasswordInputGroup>
                  <PasswordInputInput
                    autoComplete="new-password"
                    className="font-mono"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter or generate a password"
                    value={password}
                  />
                  <PasswordInputTrigger aria-label="Toggle password visibility" />
                </PasswordInputGroup>
              </PasswordInput>
              <PasswordStrengthMeter password={password} />
            </Field>

            <Field>
              <FieldLabel>One-time code secret</FieldLabel>
              <Input
                autoComplete="off"
                className="font-mono uppercase"
                onChange={(e) => setTotpSecret(e.target.value)}
                placeholder="JBSWY3DPEHPK3PXP"
                spellCheck={false}
                value={totpSecret}
              />
              <FieldDescription>
                {totp.code
                  ? `Current code: ${formatTotp(totp.code)} · ${totp.seconds}s left`
                  : 'The Base32 setup key from a site’s 2FA settings.'}
              </FieldDescription>
            </Field>
          </>
        )}

        <Field>
          <FieldLabel>Notes</FieldLabel>
          <Textarea
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Recovery codes, PINs, anything else"
            rows={type === 'note' ? 10 : 4}
            value={notes}
          />
        </Field>

        <Field>
          <FieldLabel>Tags</FieldLabel>
          <TagsInput
            addOnPaste
            delimiter=","
            onValueChange={({ value }) => setTags(value)}
            placeholder={tags.length ? '' : 'work, personal…'}
            value={tags}
          >
            {tags.map((tag, index) => (
              <TagsInputItem index={index} key={tag} value={tag}>
                {tag}
              </TagsInputItem>
            ))}
          </TagsInput>
          <FieldDescription>
            Press Enter or comma to add a tag.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>Custom fields</SectionLabel>
          <Button
            onClick={() =>
              setCustomFields((fields) => [
                ...fields,
                { id: crypto.randomUUID(), name: '', value: '', type: 'text' },
              ])
            }
            size="sm"
            variant="ghost"
          >
            <PlusIcon />
            Add field
          </Button>
        </div>

        {customFields.length > 0 && (
          <div className="space-y-2">
            {customFields.map((field) => (
              <div className="flex items-center gap-2" key={field.id}>
                <Input
                  aria-label="Field name"
                  className="w-1/3"
                  onChange={(e) =>
                    updateField(field.id, { name: e.target.value })
                  }
                  placeholder="Label"
                  value={field.name}
                />
                <Input
                  aria-label="Field value"
                  className="flex-1 font-mono"
                  onChange={(e) =>
                    updateField(field.id, { value: e.target.value })
                  }
                  placeholder="Value"
                  type={field.type === 'hidden' ? 'password' : 'text'}
                  value={field.value}
                />
                <NativeSelect
                  aria-label="Field type"
                  onChange={(e) =>
                    updateField(field.id, {
                      type: e.target.value as CustomField['type'],
                    })
                  }
                  value={field.type}
                >
                  <NativeSelectOption value="text">Text</NativeSelectOption>
                  <NativeSelectOption value="hidden">Hidden</NativeSelectOption>
                </NativeSelect>
                <Button
                  aria-label="Remove field"
                  onClick={() =>
                    setCustomFields((fields) =>
                      fields.filter((f) => f.id !== field.id),
                    )
                  }
                  size="icon-md"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </form>
  )
}
