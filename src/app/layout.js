'use client';
import './globals.css';
import { SessionProvider } from 'next-auth/react';
import { DataProvider } from '@/context/DataContext';
import LayoutShell from '@/components/LayoutShell';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Inter', sans-serif" }}>
        <SessionProvider>
          <DataProvider>
            <LayoutShell>{children}</LayoutShell>
          </DataProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
