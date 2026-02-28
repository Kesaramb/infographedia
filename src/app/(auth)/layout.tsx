export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      {/* Ambient background blurs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-white/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-white/5 rounded-full blur-[150px]" />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
