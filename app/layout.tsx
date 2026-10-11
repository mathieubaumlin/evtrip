import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'EV Trip — Votre voyage électrique', description: 'Préparez votre trajet électrique, visualisez vos recharges et partagez votre récapitulatif.',
  manifest: '/manifest.webmanifest', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'EV Trip' },
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' }
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#133f35' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body>{children}</body></html>;
}
