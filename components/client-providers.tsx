'use client';

import { ReactNode } from 'react';
import { NotificationProvider } from '@/components/notification-system';
import { KeyboardShortcutProvider } from '@/components/keyboard-shortcuts';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <NotificationProvider>
      <KeyboardShortcutProvider
        onNavigate={(path: string) => {
          window.location.href = path;
        }}
        onAddProduct={() => {
          console.log('Add product');
        }}
        onSearch={() => {
          console.log('Search');
        }}
        onSave={() => {
          console.log('Save');
        }}
        onPrint={() => {
          console.log('Print');
        }}
        onExport={() => {
          console.log('Export');
        }}
        onRefresh={() => {
          window.location.reload();
        }}
        onSettings={() => {
          console.log('Settings');
        }}
      >
        {children}
      </KeyboardShortcutProvider>
    </NotificationProvider>
  );
}