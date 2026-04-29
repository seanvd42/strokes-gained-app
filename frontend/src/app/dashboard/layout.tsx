'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Target, LayoutDashboard, User, Upload, LogOut, Menu, X } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/signin')
    } else {
      setUser(user)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sage-50">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Import Data', href: '/dashboard/import', icon: Upload },
    { name: 'Profile', href: '/dashboard/profile', icon: User },
  ]

  return (
    <div className="min-h-screen bg-sage-50">
      {/* Header */}
      <header className="bg-white border-b border-sage-200 sticky top-0 z-40">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <Target className="w-8 h-8 text-golf-fairway" />
              <span className="text-xl font-display font-bold text-sage-900 hidden sm:block">
                Strokes Gained
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sage-700 hover:bg-sage-50 hover:text-golf-fairway font-display font-semibold transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm font-body text-sage-600">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sage-700 hover:bg-red-50 hover:text-red-600 font-display font-semibold transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-sage-100"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 text-sage-700" />
                ) : (
                  <Menu className="w-6 h-6 text-sage-700" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-sage-200 bg-white">
            <nav className="container mx-auto px-6 py-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sage-700 hover:bg-sage-50 hover:text-golf-fairway font-display font-semibold transition-colors"
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sage-700 hover:bg-red-50 hover:text-red-600 font-display font-semibold transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
