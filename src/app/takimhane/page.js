'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import { Archive, Plus, Search, Filter, Download } from 'lucide-react'

export default function TakimhanePage() {
    const { profile, loading: authLoading } = usePermissions()
    const [loading, setLoading] = useState(false)
    const canView = profile?.roles?.permissions?.includes('view_toolroom') || profile?.roles?.name === 'Admin'

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    if (!canView) {
        return (
            <div className="main-container">
                <Sidebar profile={profile} />
                <main className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <Archive style={{ opacity: 0.2, marginBottom: '1rem' }} size={64} />
                        <h2>Yetkisiz Erişim</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Takımhane Paneli'ni görüntüleme yetkiniz bulunmamaktadır.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => window.location.href = '/'}>Ana Sayfaya Dön</button>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '3rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Takımhane Yönetimi</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Takım, aparat ve stok kayıtlarınızı buradan yönetebilirsiniz.</p>
                    </div>
                </header>

                <div className="card" style={{ padding: '4rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border)' }}>
                    <div style={{ display: 'inline-flex', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '2rem', marginBottom: '1.5rem' }}>
                        <Archive size={48} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Yeni Takımhane Sisteminiz Hazırlanıyor</h3>
                    <p style={{ color: 'var(--muted-foreground)', maxWidth: '500px', margin: '0 auto' }}>
                        Excel sisteminizi buraya entegre etmek için hazırız. Lütfen yapılacakları tarif edin, biz ona uygun sütunları ve formu oluşturalım.
                    </p>
                </div>
            </main>
        </div>
    )
}
