'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { InfographicDNA } from '@/lib/dna/schema'

// ============================================================
// Modal Context — controls the iterate/create modal globally
// ============================================================

interface ModalState {
  isOpen: boolean
  mode: 'create' | 'iterate'
  parentPost?: {
    id: number | string
    title: string
    dna: InfographicDNA
    author: string
  }
}

interface ModalContextValue {
  modal: ModalState
  openCreate: () => void
  openIterate: (parentPost: NonNullable<ModalState['parentPost']>) => void
  closeModal: () => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
  })

  const openCreate = useCallback(() => {
    setModal({ isOpen: true, mode: 'create' })
  }, [])

  const openIterate = useCallback(
    (parentPost: NonNullable<ModalState['parentPost']>) => {
      setModal({ isOpen: true, mode: 'iterate', parentPost })
    },
    []
  )

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return (
    <ModalContext.Provider value={{ modal, openCreate, openIterate, closeModal }}>
      {children}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModal must be used within ModalProvider')
  return ctx
}
