'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Camera, X, Hash, Scan, Flashlight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BarcodeScannerComponent from 'react-barcode-reader';

interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onScanSuccess?: (barcode: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function BarcodeInput({
  value,
  onChange,
  onScanSuccess,
  onError,
  placeholder = 'Enter or scan barcode',
  label = 'Barcode Number',
  disabled = false,
  className = '',
}: BarcodeInputProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startCamera = () => {
    setIsScanning(true);
    setScanningStatus('Ready to scan - point camera at barcode');
  };

  const stopCamera = () => {
    setIsScanning(false);
    setScanningStatus('');
    setTorchEnabled(false);
  };

  const handleScan = (result: string) => {
    if (result) {
      onChange(result);
      onScanSuccess?.(result);

      // Haptic feedback on mobile
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(200);
      }

      stopCamera();
    }
  };

  const handleError = (error: any) => {
    console.warn('Barcode scanning error:', error);
    onError?.(error?.message || 'Scanner error occurred');
  };

  const toggleTorch = () => {
    setTorchEnabled(!torchEnabled);
  };

  // Prevent body scroll when scanning on mobile
  useEffect(() => {
    if (isScanning && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isScanning, isMobile]);

  return (
    <>
      <div className={`space-y-2 ${className}`}>
        <Label htmlFor="barcode" className="flex items-center gap-2 text-sm font-medium">
          <Hash className="h-4 w-4" />
          {label}
        </Label>
        <div className="flex gap-2">
          <Input
            id="barcode"
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 text-base" // Prevent zoom on iOS
          />
          <Button
            type="button"
            variant="outline"
            size={isMobile ? 'default' : 'icon'}
            onClick={startCamera}
            disabled={isScanning || disabled}
            className="shrink-0"
            title="Scan barcode with camera"
          >
            <Camera className="h-4 w-4" />
            {isMobile && <span className="ml-2 text-sm">Scan</span>}
          </Button>
        </div>
      </div>

      {/* Mobile-Optimized Camera Scanner */}
      {isScanning && (
        <div
          className={`fixed inset-0 z-50 bg-black ${
            isMobile ? '' : 'bg-black/50 flex items-center justify-center p-4'
          }`}
        >
          {isMobile ? (
            // Full-screen mobile scanner
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-black text-white">
                <div className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  <span className="font-medium">Scan Barcode</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={toggleTorch} className="text-white hover:bg-white/20">
                    <Flashlight className={`h-5 w-5 ${torchEnabled ? 'text-yellow-400' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={stopCamera} className="text-white hover:bg-white/20">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Camera View */}
              <div className="flex-1 relative">
                <BarcodeScannerComponent
                  width="100%"
                  height="100%"
                  onUpdate={(err, result) => {
                    if (result) {
                      handleScan(result.text);
                    }
                    if (err) {
                      handleError(err);
                    }
                  }}
                  facingMode={isMobile ? 'environment' : 'user'}
                  torch={torchEnabled}
                />

                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    {/* Scanning frame */}
                    <div className="w-72 h-48 border-2 border-white rounded-lg relative">
                      {/* Corner indicators */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>

                      {/* Scanning line animation */}
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div className="w-full h-0.5 bg-green-400 animate-pulse absolute top-1/2 transform -translate-y-1/2"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-black text-white space-y-3">
                {scanningStatus && (
                  <div className="text-center">
                    <Badge variant="secondary" className="text-sm">
                      {scanningStatus}
                    </Badge>
                  </div>
                )}

                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-300">Position barcode within the frame</p>
                  <p className="text-xs text-gray-400">Supports QR codes and most barcode formats</p>
                </div>
              </div>
            </div>
          ) : (
            // Desktop scanner modal
            <Card className="w-full max-w-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Scan className="h-5 w-5" />
                    Scan Barcode
                  </CardTitle>
                  <CardDescription>Position the barcode within the camera view</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={stopCamera}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                  <BarcodeScannerComponent
                    width="100%"
                    height="100%"
                    onUpdate={(err, result) => {
                      if (result) {
                        handleScan(result.text);
                      }
                      if (err) {
                        handleError(err);
                      }
                    }}
                    facingMode="user"
                    torch={torchEnabled}
                  />

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-32 border-2 border-white border-dashed rounded-lg flex items-center justify-center">
                      <Badge variant="secondary" className="bg-white/90 text-black">
                        <Scan className="h-4 w-4 mr-1" />
                        Scanning...
                      </Badge>
                    </div>
                  </div>
                </div>

                {scanningStatus && (
                  <div className="text-center">
                    <Badge variant="outline" className="text-sm">
                      {scanningStatus}
                    </Badge>
                  </div>
                )}

                <div className="text-sm text-muted-foreground text-center space-y-2">
                  <p>Supported formats: QR Code, Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF, PDF417</p>
                  <p>Hold the barcode steady within the frame for automatic detection</p>
                </div>

                <Button variant="outline" onClick={stopCamera} className="w-full">
                  Cancel Scanning
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
