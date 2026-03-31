'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import {
    Navigation,
    User,
    Calendar,
    Package,
    Shield,
    ArrowRightCircle,
    Search
} from 'lucide-react'

export default function FieldInventoryPage() {
    const router = useRouter()
    const { profile, loading: authLoading } = usePermissions()

    const canView = profile?.roles?.permissions?.includes('view_toolroom_field') || profile?.roles?.name === 'Admin'

    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [inventoryByPerson, setInventoryByPerson] = useState([])

    const fetchData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('toolroom_transactions')
            .select('*')
            .order('transaction_date', { ascending: false })

        if (!error && data) {
            const tempGroupings = {}

            // Kronolojik olarak işle (Eskiden yeniye)
            const sortedData = [...data].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date))

            sortedData.forEach(t => {
                if (!t.reciever_sender) return

                const key = `${t.reciever_sender}_${t.item_no}_${t.item_description}`
                if (!tempGroupings[key]) {
                    tempGroupings[key] = {
                        person: t.reciever_sender,
                        department: t.department,
                        item_no: t.item_no,
                        item_description: t.item_description,
                        is_calibration: t.is_calibration,
                        serial_no: t.serial_no,
                        hand_count: 0,
                        latest_date: t.transaction_date,
                        latest_location: t.location
                    }
                }

                const absQty = Math.abs(t.quantity || 0)

                if (t.transaction_type === 'Giriş') {
                    // İade: Eldeki miktarı azalt (en az 0 olabilir)
                    tempGroupings[key].hand_count = Math.max(0, tempGroupings[key].hand_count - absQty)
                } else if (t.transaction_type === 'Çıkış' || t.transaction_type === 'Zimmet') {
                    // Çıkış/Zimmet: Eldeki miktarı artır
                    tempGroupings[key].hand_count += absQty
                    // En son nereye/ne zaman gittiğini güncelle
                    tempGroupings[key].latest_date = t.transaction_date
                    tempGroupings[key].latest_location = t.location
                }
            })

            // Sadece elinde ürün olanları (hand_count > 0) listele
            const activeInventory = Object.values(tempGroupings)
                .filter(item => item.hand_count > 0)
                .map(item => ({
                    ...item,
                    quantity: item.hand_count
                }))

            setInventoryByPerson(activeInventory)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (profile) fetchData()
    }, [profile])

    const filtered = inventoryByPerson.filter(item =>
        item.person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.latest_location?.toLowerCase().includes(searchTerm.toLowerCase())
    )

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
                        <p style={{ color: 'var(--muted-foreground)' }}>Saha Envanteri modülünü görüntüleme yetkiniz bulunmamaktadır.</p>
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
                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
                            <Navigation size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Saha Envanteri</h2>
                            <p style={{ color: 'var(--muted-foreground)' }}>Personelin üzerinde bulunan aktif ekipmanların listesi.</p>
                        </div>
                    </div>
                </header>

                <div className="card" style={{
                    marginBottom: '2rem',
                    padding: '1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ position: 'relative', width: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', opacity: 0.6 }} />
                        <input
                            type="text"
                            placeholder="Personel veya ekipman ara..."
                            className="input-field"
                            style={{ paddingLeft: '3.25rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--card)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'rgba(59, 130, 246, 0.05)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Personel</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Bölüm</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Ekipman</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Seri No</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', textAlign: 'center' }}>Adet</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Proje / Lokasyon</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Alış Tarihi</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>Süre</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center' }}>Hesaplanıyor...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Herhangi bir zimmet kaydı bulunamadı.</td></tr>
                            ) : filtered.map((row, idx) => {
                                const days = Math.floor((new Date() - new Date(row.latest_date)) / (1000 * 60 * 60 * 24));
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row-hover">
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem' }}>
                                                    {row.person?.charAt(0)}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{row.person}</div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.75rem', opacity: 0.7 }}>{row.department}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{row.item_description}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{row.item_no}</div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.75rem' }}>
                                            {row.is_calibration ? (
                                                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{row.serial_no}</span>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{ padding: '0.25rem 0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '6px', fontWeight: 900, fontSize: '0.85rem' }}>
                                                {row.quantity}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4ade80' }}>
                                                <ArrowRightCircle size={14} />
                                                {row.latest_location}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                                            {new Date(row.latest_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 800,
                                                color: days > 30 ? '#ef4444' : days > 7 ? '#facc15' : '#4ade80'
                                            }}>
                                                {days === 0 ? 'Bugün' : `${days} Gün`}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    )
}
