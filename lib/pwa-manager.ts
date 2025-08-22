'use client';

import { logger } from '@/lib/logger';

// PWA Installation and Management
export class PWAManager {
  private static instance: PWAManager;
  private deferredPrompt: any = null;
  private isInstalled = false;
  private installPromptShown = false;

  static getInstance() {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  // Initialize PWA features
  init() {
    if (typeof window === 'undefined') return;

    this.checkInstallationStatus();
    this.setupEventListeners();
    this.registerServiceWorker();
    this.setupPeriodicSync();
    this.setupPushNotifications();
  }

  // Check if PWA is already installed
  private checkInstallationStatus() {
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      logger.info('PWA is running in standalone mode');
    }

    // Check for iOS standalone mode
    if ((window.navigator as any).standalone === true) {
      this.isInstalled = true;
      logger.info('PWA is running in iOS standalone mode');
    }

    // Update UI based on installation status
    this.updateInstallUI();
  }

  // Setup event listeners for PWA features
  private setupEventListeners() {
    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPromotion();
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.updateInstallUI();
      logger.info('PWA was installed successfully');
      
      // Track installation analytics
      this.trackInstallation();
    });

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isInstalled = e.matches;
      this.updateInstallUI();
    });

    // Handle shortcut actions
    this.handleShortcutActions();

    // Handle share target
    this.handleShareTarget();
  }

  // Register service worker
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateAvailable();
              }
            });
          }
        });

        logger.info('Service Worker registered successfully');
      } catch (error) {
        logger.error('Service Worker registration failed:', error);
      }
    }
  }

  // Setup periodic background sync
  private async setupPeriodicSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('background-sync');
        logger.info('Background sync registered');
      } catch (error) {
        logger.error('Background sync registration failed:', error);
      }
    }

    // Setup periodic sync for modern browsers
    if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
        
        if (status.state === 'granted') {
          await (registration as any).periodicSync.register('cache-refresh', {
            minInterval: 24 * 60 * 60 * 1000, // 24 hours
          });
          logger.info('Periodic sync registered');
        }
      } catch (error) {
        logger.error('Periodic sync registration failed:', error);
      }
    }
  }

  // Setup push notifications
  private async setupPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
            ),
          });

          // Send subscription to server
          await this.sendSubscriptionToServer(subscription);
          logger.info('Push notifications enabled');
        } catch (error) {
          logger.error('Push notification setup failed:', error);
        }
      }
    }
  }

  // Show install promotion
  private showInstallPromotion() {
    if (this.installPromptShown || this.isInstalled) return;

    // Create install banner
    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = `
      fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96
      bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50
      flex items-center justify-between
      transform transition-transform duration-300 translate-y-full
    `;
    
    banner.innerHTML = `
      <div class="flex-1">
        <h3 class="font-semibold text-sm mb-1">ติดตั้งแอป POS</h3>
        <p class="text-xs opacity-90">เพื่อประสบการณ์ที่ดีขึ้นและใช้งานออฟไลน์ได้</p>
      </div>
      <div class="flex gap-2 ml-3">
        <button id="pwa-install-btn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">
          ติดตั้ง
        </button>
        <button id="pwa-dismiss-btn" class="text-white/80 hover:text-white text-sm">
          ปิด
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    // Animate in
    setTimeout(() => {
      banner.classList.remove('translate-y-full');
    }, 100);

    // Setup event listeners
    const installBtn = banner.querySelector('#pwa-install-btn');
    const dismissBtn = banner.querySelector('#pwa-dismiss-btn');

    installBtn?.addEventListener('click', () => {
      this.showInstallPrompt();
      banner.remove();
    });

    dismissBtn?.addEventListener('click', () => {
      banner.classList.add('translate-y-full');
      setTimeout(() => banner.remove(), 300);
    });

    this.installPromptShown = true;

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (banner.parentNode) {
        banner.classList.add('translate-y-full');
        setTimeout(() => banner.remove(), 300);
      }
    }, 10000);
  }

  // Show install prompt
  async showInstallPrompt() {
    if (!this.deferredPrompt) return false;

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        logger.info('User accepted the install prompt');
      } else {
        logger.info('User dismissed the install prompt');
      }

      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      logger.error('Install prompt failed:', error);
      return false;
    }
  }

  // Show update available notification
  private showUpdateAvailable() {
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50
      max-w-sm flex items-center justify-between
    `;
    
    notification.innerHTML = `
      <div class="flex-1">
        <h3 class="font-semibold text-sm mb-1">อัปเดตใหม่พร้อมใช้งาน</h3>
        <p class="text-xs opacity-90">รีเฟรชหน้าเว็บเพื่อใช้เวอร์ชันล่าสุด</p>
      </div>
      <button id="update-btn" class="bg-white text-green-600 px-3 py-1 rounded text-sm font-medium ml-3">
        อัปเดต
      </button>
    `;

    document.body.appendChild(notification);

    const updateBtn = notification.querySelector('#update-btn');
    updateBtn?.addEventListener('click', () => {
      window.location.reload();
    });

    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 15000);
  }

  // Update install UI based on installation status
  private updateInstallUI() {
    const installBtns = document.querySelectorAll('[data-pwa-install]');
    installBtns.forEach((btn) => {
      if (this.isInstalled) {
        (btn as HTMLElement).style.display = 'none';
      } else {
        (btn as HTMLElement).style.display = '';
      }
    });
  }

  // Handle shortcut actions from manifest
  private handleShortcutActions() {
    const url = new URL(window.location.href);
    const action = url.searchParams.get('action');

    if (action) {
      switch (action) {
        case 'add-product':
          // Navigate to add product page
          this.navigateToAction('/dashboard?tab=add-product');
          break;
        case 'search':
          // Open search modal
          this.triggerSearch();
          break;
        case 'reports':
          // Navigate to reports
          this.navigateToAction('/dashboard?tab=analytics');
          break;
        case 'scan':
          // Open barcode scanner
          this.triggerBarcodeScanner();
          break;
      }

      // Clean up URL
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.toString());
    }
  }

  // Handle share target
  private handleShareTarget() {
    const url = new URL(window.location.href);
    
    if (url.pathname === '/share') {
      // Handle shared content
      this.handleSharedContent();
    }
  }

  // Navigation helpers
  private navigateToAction(path: string) {
    // Use router navigation if available, otherwise direct navigation
    if (window.location.pathname !== path) {
      window.location.href = path;
    }
  }

  private triggerSearch() {
    // Trigger search functionality
    const searchBtn = document.querySelector('[data-search-trigger]') as HTMLElement;
    searchBtn?.click();
  }

  private triggerBarcodeScanner() {
    // Trigger barcode scanner
    const scanBtn = document.querySelector('[data-scan-trigger]') as HTMLElement;
    scanBtn?.click();
  }

  private handleSharedContent() {
    // Handle content shared to the app
    logger.info('Handling shared content');
  }

  // Utility methods
  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async sendSubscriptionToServer(subscription: PushSubscription) {
    try {
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      logger.error('Failed to send subscription to server:', error);
    }
  }

  private trackInstallation() {
    // Track PWA installation analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install', {
        event_category: 'engagement',
        event_label: 'pwa_installation'
      });
    }
  }

  // Public methods
  getInstallationStatus() {
    return {
      isInstalled: this.isInstalled,
      canInstall: !!this.deferredPrompt,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    };
  }

  async installApp() {
    return await this.showInstallPrompt();
  }

  // Check for app updates
  async checkForUpdates() {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
  }

  // Share API
  async shareContent(data: { title?: string; text?: string; url?: string }) {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          logger.error('Share failed:', error);
        }
        return false;
      }
    }
    return false;
  }

  // Badge API (for unread notifications count)
  setBadge(count: number) {
    if ('setAppBadge' in navigator) {
      (navigator as any).setAppBadge(count);
    }
  }

  clearBadge() {
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge();
    }
  }
}

// Initialize PWA Manager
export const pwaManager = PWAManager.getInstance();

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
  pwaManager.init();
}

// React hook for PWA features
export function usePWA() {
  const [installationStatus, setInstallationStatus] = React.useState(
    pwaManager.getInstallationStatus()
  );

  React.useEffect(() => {
    const updateStatus = () => {
      setInstallationStatus(pwaManager.getInstallationStatus());
    };

    // Listen for installation changes
    window.addEventListener('appinstalled', updateStatus);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', updateStatus);

    return () => {
      window.removeEventListener('appinstalled', updateStatus);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', updateStatus);
    };
  }, []);

  return {
    ...installationStatus,
    installApp: () => pwaManager.installApp(),
    shareContent: (data: any) => pwaManager.shareContent(data),
    setBadge: (count: number) => pwaManager.setBadge(count),
    clearBadge: () => pwaManager.clearBadge(),
    checkForUpdates: () => pwaManager.checkForUpdates(),
  };
}