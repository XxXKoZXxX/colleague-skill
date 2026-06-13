import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Koz Custom — Fine Custom Jewelry',
  description: 'Bespoke custom jewelry crafted from rough stones.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-stone-950 text-stone-100 min-h-screen`}>
        <nav className="border-b border-stone-800 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-widest text-amber-400">
            KOZ CUSTOM
          </Link>
          <div className="flex gap-6 text-sm text-stone-400">
            <Link href="/" className="hover:text-amber-400 transition-colors">Order</Link>
            <Link href="/inventory" className="hover:text-amber-400 transition-colors">Inventory</Link>
            <Link href="/admin" className="hover:text-amber-400 transition-colors">Admin</Link>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-6 py-12">
          {children}
        </main>
        <footer className="border-t border-stone-800 mt-20 px-6 py-6 text-center text-stone-600 text-xs">
          © {new Date().getFullYear()} Koz Custom. All rights reserved.
        </footer>
      </body>
    </html>
  )
}
