import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'block w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm text-sand-900 shadow-sm transition placeholder:text-sand-400 focus:border-brandBlue focus:outline-none focus:ring-2 focus:ring-brandBlueLight/40 disabled:cursor-not-allowed disabled:bg-sand-100',
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
