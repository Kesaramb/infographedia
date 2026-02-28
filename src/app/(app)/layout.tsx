'use client'

import { Sidebar } from '@/components/ui/sidebar'
import { MobileNav } from '@/components/ui/mobile-nav'
import { AuthProvider } from '@/hooks/use-auth'
import { ModalProvider } from '@/components/modals/modal-provider'
import { IterateModal } from '@/components/modals/iterate-modal'
import { ToastProvider } from '@/components/ui/toast'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
    <ToastProvider>
    <ModalProvider>
      <div className="relative overflow-hidden flex justify-center">
        {/* Ambient Background Lights for Glassmorphism Depth */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-white/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-white/5 rounded-full blur-[150px]" />
        </div>

        {/* Main Layout Container */}
        <div className="flex w-full max-w-6xl relative z-10">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-grow max-w-xl mx-auto w-full pb-24 md:pb-0 min-h-screen">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Nav */}
        <MobileNav />

        {/* Global Iterate/Create Modal */}
        <IterateModal />
      </div>
    </ModalProvider>
    </ToastProvider>
    </AuthProvider>
  )
}
