import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
  error?: boolean;
  'aria-describedby'?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, error, ...props }, ref) => {
    return (
      <input
        type={type}
        value={value ?? ''} // Ensure value is always defined
        className={cn(
          'flex h-11 w-full rounded-lg border border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 hover:border-primary/40 focus:border-primary',
          error && 'border-destructive focus-visible:ring-destructive hover:border-destructive',
          className
        )}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
