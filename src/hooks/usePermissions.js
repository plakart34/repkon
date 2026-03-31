import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

export function usePermissions() {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const pathname = usePathname()
    const router = useRouter()

    const checkUser = useCallback(async () => {
        // Skip check if we're on the server or missing supabase config
        if (typeof window === 'undefined' || !supabase) {
            setLoading(false)
            return
        }

        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser()

            if (authError || !user) {
                console.warn('Auth check: No user found or auth error:', authError)
                if (pathname !== '/login') {
                    router.replace('/login')
                }
                setLoading(false)
                return
            }

            // Fetch profile and join role
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*, roles(*)')
                .eq('id', user.id)
                .single()

            if (profileError || !profileData) {
                console.error('Profile fetch error:', profileError)
                // If profile doesn't exist, log out the phantom session
                await supabase.auth.signOut()
                if (pathname !== '/login') router.replace('/login')
                setLoading(false)
                return
            }

            const role = profileData.roles
            const profileWithRole = { ...user, ...profileData, roles: role }

            // Update profile state only if it changed to prevent loops
            setProfile(prev => {
                if (!prev || prev.id !== profileWithRole.id) return profileWithRole
                return prev
            })

            const allowedPaths = role?.permissions || []
            const isAdmin = role?.name === 'Admin'

            const getPermissionKey = (path) => {
                if (path === '/' || path.startsWith('/dashboard')) return 'view_dashboard'
                if (path.startsWith('/projects')) return 'view_projects'
                if (path.startsWith('/workshop')) return 'view_workshop'
                if (path.startsWith('/tasks')) return 'view_tasks'
                if (path.startsWith('/logs')) return 'view_logs'
                if (path.startsWith('/team')) return 'view_team'
                if (path.startsWith('/register-staff')) return 'create_staff'
                if (path.startsWith('/takimhane/calibration')) return 'view_toolroom_calibration'
                if (path.startsWith('/takimhane/in-out')) return 'view_toolroom_in_out'
                if (path.startsWith('/takimhane/stock')) return 'view_toolroom_stock'
                if (path.startsWith('/takimhane/field')) return 'view_toolroom_field'
                if (path.startsWith('/takimhane/scrap')) return 'view_toolroom_scrap'
                if (path.startsWith('/takimhane/datesheet')) return 'view_toolroom_datesheet'
                if (path.startsWith('/takimhane/definitions')) return 'view_toolroom_definitions'
                if (path.startsWith('/takimhane')) return 'view_toolroom'
                return null
            }

            const currentKey = getPermissionKey(pathname)
            // Admin her zaman yetkilidir, aksi halde key varsa listede olmalı, key yoksa herkese açık demektir
            const isAllowed = isAdmin === true || (currentKey && allowedPaths.includes(currentKey)) || !currentKey

            if (!isAllowed && pathname !== '/unauthorized' && pathname !== '/login') {
                router.replace('/unauthorized')
            }

            if (pathname === '/login' && user) {
                router.replace('/')
            }
        } catch (error) {
            console.error('Critical auth check error:', error)
        } finally {
            // Guarantee loading is false after attempt
            setLoading(false)
        }
    }, [pathname, router]) // Removed profile dependency to avoid recreation loops

    useEffect(() => {
        let isMounted = true
        if (isMounted) checkUser()
        return () => { isMounted = false }
    }, [pathname, checkUser])

    return { profile, loading }
}
