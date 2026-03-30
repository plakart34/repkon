'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import { FileText, Search, Download } from 'lucide-react'

export default function ToolroomDatesheetPage() {
    const { profile, loading: authLoading } = usePermissions()

    if (authLoading) return <div className="loading-container">Sistem Yükleniyor...</div>
    if (!profile) return null

    return (
        <div className="main-container">
            <Sidebar profile={profile} />

            <main className="content animate-fade-in">
                <header className="header" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Takımhane Datesheet</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Takım ve ürünlerin teknik veri ve kayıtları.</p>
                    </div>
                </header>

                <div className="card" style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                    <FileText size={48} style={{ marginBottom: '1rem', color: '#facc15' }} />
                    <h3>Datesheet Paneli</h3>
                    <p>Bu alan bir sonraki adımda tasarlanacaktır.</p>
                </div>
            </main>
        </div>
    )
}
