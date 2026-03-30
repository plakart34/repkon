'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY = 'BApbWe5kFL_K5BK2caiV3wiBiCTdukEaBkWtfVIySApUOEYY2WnGZkGMUGBaTVWlJ5PIFiBCua5lRz4FX4gId6M'

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function SWRegistration() {
    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(async (registration) => {
                    console.log('SW Registered');

                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    try {
                        const subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                        });

                        // Save subscription to Supabase
                        await supabase.from('push_subscriptions').insert([{
                            user_id: session.user.id,
                            subscription: subscription.toJSON()
                        }]);

                        console.log('Push subscription saved.');
                    } catch (err) {
                        console.log('Push Subscription failed:', err);
                    }
                })
                .catch((err) => console.log('SW registration failed:', err));
        }
    }, []);

    return null;
}
