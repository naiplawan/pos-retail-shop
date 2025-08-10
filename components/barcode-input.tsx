'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  placeholder = 'Enter barcode',
  label = 'Barcode Number',
  disabled = false,
  className = '',
}: BarcodeInputProps) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Auto-trigger scan success if barcode is complete (e.g., 13 digits for EAN-13)
    if (newValue.length === 13 && /^\d+$/.test(newValue)) {
      onScanSuccess?.(newValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value) {
      onScanSuccess?.(value);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="barcode-input" className="flex items-center gap-2">
        <Hash className="h-4 w-4" />
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id="barcode-input"
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 font-mono"
          inputMode={isMobile ? 'numeric' : 'text'}
          autoComplete="off"
          aria-label="Barcode input field"
        />
      </div>
    </div>
  );
}