export default function manifest() {
    return {
        name: 'Milkus ERP',
        short_name: 'MilkusERP',
        description: 'Frontend za ulaz, izlaz, vagu i stanje robe',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b1220',
        theme_color: '#0f172a',
        lang: 'bs',
        icons: [
            {
                src: '/pwa-icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
            },
        ],
    };
}
