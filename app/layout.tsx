import type { Metadata, Viewport } from "next"
import { Geist_Mono } from "next/font/google"
import "./globals.css"

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Spinna — SA Drift Arcade",
  description: "South African car spinning / drifting arcade game. Spin for Rands. Shisa Nyama.",
}

export const viewport: Viewport = {
  themeColor: "#0a0807",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0807] text-white">
        {children}
      </body>
    </html>
  )
}
