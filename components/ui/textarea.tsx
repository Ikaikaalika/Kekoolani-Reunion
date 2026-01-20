import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-black shadow-sm transition focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40 disabled:cursor-not-allowed disabled:bg-slate-100',
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
