import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CareGrid Remote Patient Monitoring',
    short_name: 'CareGrid',
    description: 'CareGrid connected-care and remote patient monitoring workspace.',
    start_url: '/login/',
    display: 'standalone',
    background_color: '#f5f8fa',
    theme_color: '#0f2a3b',
    orientation: 'any',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  };
}
