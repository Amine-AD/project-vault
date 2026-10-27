export type ItemType = 'login' | 'note'

export interface CustomField {
  id: string
  name: string
  value: string
  type: 'text' | 'hidden'
}

export interface BaseItem {
  id: string
  type: ItemType
  title: string
  notes?: string
  customFields?: CustomField[]
  isFavorite: boolean
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface LoginItem extends BaseItem {
  type: 'login'
  username: string
  password: string
  url?: string
  totpSecret?: string
}

export interface NoteItem extends BaseItem {
  type: 'note'
}

export type DecryptedItem = LoginItem | NoteItem

export interface UserSession {
  id: string
  email: string
}
