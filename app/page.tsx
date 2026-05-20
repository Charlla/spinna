'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SpinnaGarage from '@/components/spinna-garage'
import SpinnaIntro from '@/components/spinna-intro'
import { SAVE_KEY, DEFAULT_SAVE, SaveData } from '@/lib/spinna-data'

interface Player {
  id: string
  username: string
  email: string
}

export default function Home() {
  const router = useRouter()
  const [save, setSave] = useState<SaveData>({ ...DEFAULT_SAVE })
  const [player, setPlayer] = useState<Player | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  // Load save from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const merged: SaveData = { ...DEFAULT_SAVE, ...parsed }
        if (!Array.isArray(merged.ownedCars)) merged.ownedCars = ['e30']
        if (!merged.ownedCars.includes('e30')) merged.ownedCars.push('e30')
        setSave(merged)
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  // Check auth (silent — guest is fine)
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.player) setPlayer(data.player) })
      .catch(() => {})
  }, [])

  const handleSave = useCallback((newSave: SaveData) => {
    setSave(newSave)
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(newSave)) } catch { /* ignore */ }
  }, [])

  const handlePlay = useCallback(() => {
    sessionStorage.setItem('spinna_game_save', JSON.stringify(save))
    router.push('/game')
  }, [save, router])

  const handleLogin = useCallback(() => {
    router.push('/auth/login')
  }, [router])

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setPlayer(null)
  }, [])

  if (!loaded) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#0a0807]">
        <div className="font-mono text-amber-300 tracking-[6px] text-xs animate-pulse">
          LOADING SPINMFANA…
        </div>
      </main>
    )
  }

  if (showIntro) {
    return (
      <SpinnaIntro
        onStart={(modeId) => {
          if (modeId === 'multiplayer') { router.push('/online'); return }
          if (modeId === 'passplay') { router.push('/passplay'); return }
          handleSave({ ...save, mode: modeId })
          setShowIntro(false)
        }}
      />
    )
  }

  return (
    <SpinnaGarage
      save={save}
      onSave={handleSave}
      onPlay={handlePlay}
      player={player}
      onLogin={handleLogin}
      onLogout={handleLogout}
    />
  )
}
