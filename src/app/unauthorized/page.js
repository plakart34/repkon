'use client'

import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function Unauthorized() {
    return (
        <div className="main-container" style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <div className="card" style={{ textAlign: 'center', padding: '3rem', width: '400px' }}>
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1.5rem' }}>
                    <AlertCircle size={48} />
                </div>
                <h2 style={{ marginBottom: '1rem' }}>Erişim Yetkiniz Yok</h2>
                <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
                    Bu sayfayı görüntülemek için yeterli yetkiye sahip değilsiniz. Lütfen yöneticinizle iletişime geçin.
                </p>
                <a href="/" className="btn btn-primary" style={{ width: '100%' }}>
                    <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Panele Dön
                </a>
            </div>
        </div>
    )
}
