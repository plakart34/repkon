'use client'

import { useState, useEffect } from 'react'
import { storage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import Sidebar from '@/components/Sidebar'
import { Database, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'

export default function MigrationPage() {
    const { profile, loading: authLoading } = usePermissions()
    const [status, setStatus] = useState('ready')
    const [progress, setProgress] = useState({ total: 0, current: 0, type: '' })
    const [logs, setLogs] = useState([])

    if (authLoading) return <div style={{ background: '#09090b', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Yükleniyor...</div>
    if (!profile || profile.roles?.name !== 'Admin') return <div style={{ color: 'white', padding: '5rem' }}>Bu sayfa sadece Admin yetkisine sahiptir.</div>

    const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])

    const startMigration = async () => {
        if (!confirm('Yerel verileri Supabase\'e aktarmak istediğinize emin misiniz? (Mevcut verilerle çakışabilir)')) return

        setStatus('migrating')
        setLogs([])

        try {
            // 1. Roles
            addLog('Roller aktarılıyor...')
            const localRoles = storage.getRoles()
            for (const r of localRoles) {
                const { error } = await supabase.from('roles').upsert([{
                    name: r.name,
                    description: r.description,
                    permissions: r.permissions
                }], { onConflict: 'name' })
                if (error) addLog(`Rol hatası: ${error.message}`)
            }

            // 2. Departments
            addLog('Departmanlar aktarılıyor...')
            const localDepts = storage.getDepartments()
            for (const d of localDepts) {
                const { error } = await supabase.from('depts').upsert([{ name: d }], { onConflict: 'name' })
                if (error) addLog(`Departman hatası: ${error.message}`)
            }

            // 3. Projects
            addLog('Projeler aktarılıyor...')
            const localProjects = storage.getProjects()
            for (const p of localProjects) {
                const { error } = await supabase.from('projects').upsert([{
                    name: p.name,
                    status: p.status,
                    progress: p.progress,
                    est_start: p.estStart,
                    est_shipment: p.estShipment,
                    responsible_engineer: p.responsibleEngineer
                }], { onConflict: 'name' })
                if (error) addLog(`Proje hatası: ${error.message}`)
            }

            // 4. Operations
            addLog('Çalıştay aksiyonları aktarılıyor...')
            const localOps = storage.getOperations()
            for (const op of localOps) {
                const { error } = await supabase.from('operations').insert([{
                    order_id: op.orderId,
                    project_name: op.projectName,
                    machine_name: op.machineName,
                    machine_model: op.machineModel,
                    bom_name: op.bomName,
                    bom_code: op.bomCode,
                    list_type: op.listType,
                    process: op.process,
                    target_date: op.targetDate,
                    responsible_dept: op.responsibleDept,
                    responsible_person: op.responsiblePerson,
                    notes: op.notes,
                    user_name: op.userName,
                    status: op.status,
                    history: op.history
                }])
                if (error) addLog(`Operasyon hatası: ${error.message}`)
            }

            addLog('Migrasyon tamamlandı!')
            setStatus('done')
        } catch (err) {
            addLog(`KRİTİK HATA: ${err.message}`)
            setStatus('error')
        }
    }

    return (
        <div className="main-container">
            <Sidebar profile={profile} />
            <main className="content">
                <header className="header" style={{ marginBottom: '3rem' }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Veri Migrasyonu</h2>
                        <p style={{ color: 'var(--muted-foreground)' }}>Yerel depolamadaki (LocalStorage) verileri Supabase bulut veritabanına taşıyın.</p>
                    </div>
                </header>

                <div className="card" style={{ maxWidth: '800px' }}>
                    <div style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '1rem', borderRadius: '1rem' }}>
                                <Database size={32} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>LocalStorage {'>'} Supabase</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>Bu işlem yerel verileri buluta kopyalar.</p>
                            </div>
                        </div>

                        {status === 'ready' && (
                            <button onClick={startMigration} className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                                <RefreshCw size={20} style={{ marginRight: '0.5rem' }} /> Migrasyonu Başlat
                            </button>
                        )}

                        {status === 'migrating' && (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <RefreshCw size={48} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                                <p>Veriler taşınıyor, lütfen bekleyin...</p>
                            </div>
                        )}

                        {status === 'done' && (
                            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <CheckCircle2 size={48} style={{ color: '#4ade80', marginBottom: '1rem' }} />
                                <h4 style={{ color: '#4ade80', fontWeight: 700 }}>Başarılı!</h4>
                                <p style={{ color: 'white' }}>Tüm veriler Supabase'e aktarıldı.</p>
                                <button onClick={() => window.location.reload()} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>Sayfayı Yenile</button>
                            </div>
                        )}

                        <div style={{ marginTop: '2rem', background: '#09090b', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)' }}>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: '1rem', textTransform: 'uppercase' }}>İşlem Günlüğü</h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                                {logs.length === 0 ? '- İşlem bekleniyor -' : logs.map((log, i) => <div key={i} style={{ marginBottom: '0.25rem' }}>{log}</div>)}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)', maxWidth: '800px' }}>
                    <AlertTriangle color="#ef4444" size={24} />
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                        <strong>Önemli:</strong> Bu işlem sadece Admin'ler içindir. Verileriniz Supabase'e bir kez aktarıldıktan sonra uygulamayı her yerden bulut tabanlı olarak kullanabilirsiniz.
                    </p>
                </div>
            </main>
        </div>
    )
}
