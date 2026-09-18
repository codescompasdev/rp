'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        const register = async () => {
            try {
                await navigator.serviceWorker.register('/sw.js');
            } catch (error) {
                // Silent fail keeps UI stable if SW cannot register.
                console.error('Service worker registration failed:', error);
            }
        };

        register();
    }, []);

    return null;
}
