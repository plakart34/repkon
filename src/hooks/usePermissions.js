'use client'

import { useState, useEffect, useCallback } from 'react'
import { storage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export function usePermissions() {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const router = useRouter()

    const checkUser = useCallback(async () => {
        if (typeof window === 'undefined') return

        try {
            const { data: { user } } = await supabase.auth.getUser()
            const localUser = storage.getCurrentUser()

            const currentUser = user || localUser

            // 1. Unauthenticated users
            if (!currentUser) {
                if (pathname !== '/login') {
                    router.replace('/login')
                }
                setLoading(false)
                return
            }

            // 2. Authenticated users (Supabase or Local)
            const allRoles = storage.getRoles()
            let roleId = currentUser.role_id

            // If it's a supabase user, get role from metadata or profile table
            if (user) {
                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                if (profileData) {
                    roleId = profileData.role_id
                }
            }

            const role = allRoles.find(r => r.id?.toString() === roleId?.toString())
            const profileWithRole = { ...currentUser, roles: role }

            // Only trigger update if profile changed or is null
            if (!profile || profile.id !== currentUser.id) {
                setProfile(profileWithRole)
            }

            // 3. Permission check
            const allowedPaths = role?.permissions || []
            const isAdmin = role?.name === 'Admin'

            const getPermissionKey = (path) => {
                if (path === '/') return 'view_dashboard'
                if (path.startsWith('/projects')) return 'view_projects'
                if (path.startsWith('/workshop')) return 'view_workshop'
                if (path.startsWith('/tasks')) return 'view_tasks'
                if (path.startsWith('/logs')) return 'view_logs'
                if (path.startsWith('/team')) return 'view_team'
                return null
            }

            const currentKey = getPermissionKey(pathname)
            const isAllowed = isAdmin || (currentKey && allowedPaths.includes(currentKey))

            if (!isAllowed && pathname !== '/unauthorized' && pathname !== '/login') {
                router.replace('/unauthorized')
            }

            // 4. Already logged in check
            if (pathname === '/login' && currentUser) {
                router.replace('/')
            }
        } catch (error) {
            console.error('Auth check error:', error)
        } finally {
            setLoading(false)
        }
    }, [pathname, router, profile])

    useEffect(() => {
        // Run check initially
        checkUser()
    }, [pathname, checkUser])

    return { profile, loading }
}
