'use client';

import { cn } from '@oven/oven-ui';
import type { EscalationBannerProps } from '../types';

export function EscalationBanner({ contactInfo, reason, className }: EscalationBannerProps) {
  return (
    <div className={cn('bg-amber-50 border-t border-amber-200 px-4 py-3', className)}>
      {reason && <p className={cn('text-sm font-medium text-amber-800 mb-2')}>{reason}</p>}
      <p className={cn('text-xs text-amber-700 mb-2')}>Please contact us directly:</p>
      <div className={cn('flex flex-wrap gap-3')}>
        {contactInfo.phone && (
          <a href={`tel:${contactInfo.phone}`} className={cn('text-xs text-amber-800 underline')}>
            📞 {contactInfo.phone}
          </a>
        )}
        {contactInfo.email && (
          <a href={`mailto:${contactInfo.email}`} className={cn('text-xs text-amber-800 underline')}>
            ✉️ {contactInfo.email}
          </a>
        )}
        {contactInfo.whatsapp && (
          <a href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className={cn('text-xs text-amber-800 underline')}>
            💬 WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
