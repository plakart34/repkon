'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import { ArrowLeftRight, Search, Plus, Filter } from 'lucide-react'

export default function ToolroomInOutPage() {
    const { profile, loading: authLoading } = usePermissions()

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Takım Giriş-Çıkış</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Takımhane üzerinden ürün teslim alma ve iade işlemleri.</p>
                    </div>
                </header>

                <div className="card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                    <ArrowLeftRight size={48} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <h3>Giriş-Çıkış Paneli</h3>
                    <p>Bu alan bir sonraki adımda tasarlanacaktır.</p>
                </div>
            </main>
        </div>
    )
}
