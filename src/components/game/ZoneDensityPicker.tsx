'use client';

import React from 'react';
import { msg, useMessages } from '@/i18n';
import { useGame } from '@/context/GameContext';
import { DENSITY_ORDER, DENSITY_INFO, sanitizeDensity } from '@/transit/zoning';
import { REZONE_COST_PER_TILE } from '@/transit/balance';

const LABELS = {
  designation: msg('Designation'),
  comingSoon: msg('Coming soon'),
  rezoneHint: msg('Tap built-up residential tiles to change their designation'),
  rezoneCost: msg('Re-zoning cost per tile'),
};

/**
 * Picker for the residential designation (ייעוד מגורים) used by the residential zoning tool.
 * Shown while the residential tool is selected.
 */
export function ZoneDensityPicker({ compact = false }: { compact?: boolean }) {
  const { state, setZoneDensity } = useGame();
  const m = useMessages();
  const current = sanitizeDensity(state.selectedZoneDensity);

  return (
    <div className={compact ? 'px-2 py-1.5' : 'px-2 py-2'}>
      {!compact && (
        <div className="px-1 pb-1 text-[10px] font-bold tracking-widest text-muted-foreground">
          {m(LABELS.designation)}
        </div>
      )}
      <div className={compact ? 'flex gap-1 overflow-x-auto' : 'flex flex-col gap-0.5'}>
        {DENSITY_ORDER.map((density) => {
          const info = DENSITY_INFO[density];
          const isSelected = current === density;
          return (
            <button
              key={density}
              type="button"
              disabled={!info.available}
              onClick={() => setZoneDensity(density)}
              title={info.available ? undefined : m(LABELS.comingSoon)}
              className={[
                'flex items-center gap-1.5 rounded-md border text-xs whitespace-nowrap transition-colors',
                compact ? 'px-2 py-1.5 flex-shrink-0' : 'px-2 py-1.5 w-full',
                isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card/60',
                info.available ? '' : 'opacity-40',
              ].join(' ')}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: info.color }} />
              <span>{m(info.label)}</span>
              {!info.available && !compact && (
                <span className="ms-auto text-[10px] opacity-80">{m(LABELS.comingSoon)}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="px-1 pt-1 text-[10px] text-muted-foreground leading-tight">
        {m(LABELS.rezoneHint)} · {m(LABELS.rezoneCost)}: ${REZONE_COST_PER_TILE}
      </div>
    </div>
  );
}

export default ZoneDensityPicker;
