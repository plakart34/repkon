'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Trash2,
    Shield
} from 'lucide-react'

export default function ToolroomScrapPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = usePermissions()

    const canView = profile?.roles?.permissions?.includes('view_toolroom_scrap') || profile?.roles?.name === 'Admin'

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    if (!canView) {
        return (
            <div className="main-container">
                <Sidebar profile={profile} />
                <main className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <Shield style={{ opacity: 0.2, marginBottom: '1rem' }} size={64} />
                        <h2>Yetkisiz Erişim</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Hurda Takip modülünü görüntüleme yetkiniz bulunmamaktadır.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => router.push('/')}>Ana Sayfaya Dön</button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in shadow-xl">
                <header className="header" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px' }}>
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Hurda Takip</h2>
                            <p style={{ color: 'var(--muted-foreground)' }}>Takımhane üzerinden hurdaya ayrılan kalemlerin listesi.</p>
                        </div>
                    </div>
                </header>

                <div className="card" style={{
                    padding: '5rem',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed var(--border)',
                    borderRadius: '24px'
                }}>
                    <Trash2 size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Yakında Hizmete Girecektir</h3>
                    <p style={{ color: 'var(--muted-foreground)', maxWidth: '400px', margin: '1rem auto' }}>
                        Hurda takip modülü şu an tasarım aşamasındadır. Takımhane üzerinden hurdaya ayrılan kalemler burada listelenecektir.
                    </p>
                </div>
            </main>
        </div>
    )
}
