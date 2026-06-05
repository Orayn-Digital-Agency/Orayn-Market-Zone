export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-orayn-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="font-sora text-3xl font-bold text-orayn-gold tracking-wide">
            ORAYN
          </span>
          <p className="text-sm text-orayn-gray mt-1 font-inter">
            market.zone — Sales Operations Platform
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
