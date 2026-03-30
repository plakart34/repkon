'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, X, MessageSquare, User, Trash2 } from 'lucide-react'

export default function OperationChat({ operation, profile, onClose }) {
    const [messages, setMessages] = useState([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [profiles, setProfiles] = useState([])
    const [showMentions, setShowMentions] = useState(false)
    const [mentionSearch, setMentionSearch] = useState('')
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    const fetchProfiles = async () => {
        const { data } = await supabase.from('profiles').select('id, full_name').neq('id', profile.id)
        setProfiles(data || [])
    }

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('operation_comments')
            .select('*, profile:profiles(full_name)')
            .eq('operation_id', operation.id)
            .order('created_at', { ascending: true })

        if (!error) setMessages(data || [])
    }

    useEffect(() => {
        if (!operation) return
        fetchMessages()
        fetchProfiles()

        const channel = supabase
            .channel(`op_chat_${operation.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'operation_comments',
                filter: `operation_id=eq.${operation.id}`
            }, () => {
                fetchMessages()
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'operation_comments',
                filter: `operation_id=eq.${operation.id}`
            }, () => {
                fetchMessages()
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [operation?.id])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || loading) return
        setLoading(true)

        const content = newMessage.trim()

        const { error } = await supabase.from('operation_comments').insert([{
            operation_id: operation.id,
            user_id: profile.id,
            content: content
        }])

        if (!error) {
            setNewMessage('')

            // 1. Send notification to responsible person
            if (operation.responsible_person_id && operation.responsible_person_id !== profile.id) {
                await supabase.from('notifications').insert([{
                    user_id: operation.responsible_person_id,
                    title: 'Yeni İş Notu 💬',
                    message: `"${operation.order_id}" için yeni bir mesaj var: "${content.substring(0, 30)}..."`,
                    type: 'chat',
                    action_link: `/workshop?chat=${operation.id}`
                }])
            }

            // 2. Detect mentions and send notifications
            const mentions = content.match(/@\[([^\]]+)\]/g) || []
            if (mentions.length > 0) {
                const mentionedNames = mentions.map(m => m.match(/@\[([^\]]+)\]/)[1])
                const mentionedProfiles = profiles.filter(p => mentionedNames.includes(p.full_name))

                if (mentionedProfiles.length > 0) {
                    const mentionNotifs = mentionedProfiles.map(target => ({
                        user_id: target.id,
                        title: 'Sizden Bahsedildi! 🏷️',
                        message: `"${operation.order_id}" notunda "${profile.full_name}" sizden bahsetti.`,
                        type: 'mention',
                        action_link: `/workshop?chat=${operation.id}`
                    }))
                    await supabase.from('notifications').insert(mentionNotifs)
                }
            }
        } else {
            alert('Hata: ' + error.message)
        }
        setLoading(false)
    }

    const handleInputChange = (e) => {
        const value = e.target.value
        setNewMessage(value)

        const lastChar = value[value.length - 1]
        const lastAtPos = value.lastIndexOf('@')

        if (lastAtPos !== -1 && lastAtPos >= value.lastIndexOf(' ')) {
            const search = value.substring(lastAtPos + 1)
            setMentionSearch(search)
            setShowMentions(true)
        } else {
            setShowMentions(false)
        }
    }

    const selectMention = (targetProfile) => {
        const lastAtPos = newMessage.lastIndexOf('@')
        const prefix = newMessage.substring(0, lastAtPos)
        setNewMessage(`${prefix}@[${targetProfile.full_name}] `)
        setShowMentions(false)
        setMentionSearch('')
    }

    const handleDelete = async (msgId) => {
        if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return
        await supabase.from('operation_comments').delete().eq('id', msgId)
    }

    if (!operation) return null

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(15px)' }}>
            <div className="card animate-scale-in" style={{ width: '500px', height: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--card)', padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <MessageSquare size={18} color="var(--primary)" />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>İş Notları & Sohbet</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{operation.order_id} - {operation.process}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                            <MessageSquare size={48} style={{ marginBottom: '1rem' }} />
                            <p>Henüz bir not veya mesaj eklenmemiş.</p>
                        </div>
                    ) : (
                        messages.map((m) => {
                            const isMe = m.user_id === profile.id
                            return (
                                <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '0.2rem' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>{m.profile?.full_name}</span>
                                        {isMe && (
                                            <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.4, cursor: 'pointer', padding: '2px' }}>
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{
                                        padding: '0.75rem 1rem',
                                        background: isMe ? 'var(--primary)' : 'var(--secondary)',
                                        color: isMe ? 'white' : 'var(--foreground)',
                                        borderRadius: isMe ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                                        fontSize: '0.9rem',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        wordBreak: 'break-word'
                                    }}>
                                        {m.content.split(/(@\[[^\]]+\])/g).map((part, i) => {
                                            if (part.startsWith('@[') && part.endsWith(']')) {
                                                const name = part.match(/@\[([^\]]+)\]/)[1]
                                                return <strong key={i} style={{ color: isMe ? '#fff' : 'var(--primary)', textShadow: isMe ? '0 0 10px rgba(255,255,255,0.3)' : 'none' }}>@{name}</strong>
                                            }
                                            return part
                                        })}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.2rem', textAlign: isMe ? 'right' : 'left' }}>
                                        {new Date(m.created_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', position: 'relative' }}>
                    {/* Mention Suggestions */}
                    {showMentions && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: '1.25rem', right: '1.25rem',
                            background: 'var(--card)', border: '1px solid var(--border)',
                            borderRadius: '12px', boxShadow: '0 -10px 25px rgba(0,0,0,0.5)',
                            maxHeight: '200px', overflowY: 'auto', zIndex: 3100, marginBottom: '0.5rem'
                        }}>
                            {profiles
                                .filter(p => p.full_name.toLowerCase().includes(mentionSearch.toLowerCase()))
                                .map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => selectMention(p)}
                                        style={{
                                            padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                                            {p.full_name.charAt(0)}
                                        </div>
                                        {p.full_name}
                                    </div>
                                ))}
                            {profiles.filter(p => p.full_name.toLowerCase().includes(mentionSearch.toLowerCase())).length === 0 && (
                                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Kullanıcı bulunamadı.</div>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
                        <input
                            required
                            autoFocus
                            placeholder="Bir not yazın... (@ ile birinden bahsedin)"
                            value={newMessage}
                            onChange={handleInputChange}
                            style={{
                                flex: 1, background: 'var(--secondary)', border: '1px solid var(--border)',
                                borderRadius: '12px', padding: '0.75rem 1rem', color: 'white', outline: 'none'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || loading}
                            style={{
                                width: '45px', minWidth: '45px', height: '45px', borderRadius: '12px',
                                background: 'var(--primary)', color: 'white', border: 'none',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
