'use client';

import React, { useState } from 'react';
import { msg, useMessages } from '@/i18n';
import { useGame } from '@/context/GameContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ensureTransit, draftCost } from '@/transit/lines';
import { getTransitDerived, waitingAt, busLoad } from '@/transit/sim';
import { BUS_PRICE, BUS_CAPACITY, TICKS_PER_DAY } from '@/transit/balance';

const L = {
  title: msg('Bus Lines'),
  share: msg('Transit share today'),
  hint: msg('Tap road tiles to place stops in order. Tap the first stop again to make a loop.'),
  newLine: msg('New line'),
  stops: msg('stops'),
  cost: msg('Cost'),
  undo: msg('Undo'),
  cancel: msg('Cancel'),
  create: msg('Create line'),
  line: msg('Line'),
  buses: msg('Buses'),
  every: msg('Every {n} min'),
  riders: msg('Riders today'),
  waiting: msg('Waiting'),
  load: msg('On board'),
  broken: msg('Line cut: a stop lost its road'),
  noBuses: msg('No buses'),
  remove: msg('Delete'),
  confirm: msg('Tap again to delete'),
  errNotRoad: msg('Stops can only be placed on a road'),
  errNoConn: msg('No road connects to this stop'),
  errDup: msg('This stop is already on the line'),
  lost: msg('Gave up waiting today'),
  noLines: msg('No lines yet'),
};

const MINUTES_PER_TICK = (24 * 60) / TICKS_PER_DAY;

export function TransitPanel({ isMobile = false }: { isMobile?: boolean }) {
  const { state, finishLineDraft, undoLineStop, cancelLineDraft, changeLineBuses, removeLine } = useGame();
  const m = useMessages();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const t = ensureTransit(state.transit);
  const derived = getTransitDerived(state.id, state.gridSize);
  const d = t.draft;
  const cost = draftCost(t);
  const trips = t.today.transitTrips + t.today.carTrips;
  const share = trips > 0 ? Math.round((t.today.transitTrips / trips) * 100) : 0;
  const money = state.stats.money;

  const errorText = d?.error === 'not_road' ? L.errNotRoad : d?.error === 'no_connection' ? L.errNoConn : d?.error === 'duplicate' ? L.errDup : null;

  const position = isMobile
    ? 'fixed left-2 right-2 bottom-[8.5rem] max-h-[40vh] z-40'
    : 'fixed right-4 top-20 w-80 max-h-[70vh] z-50';

  return (
    <Card className={`${position} overflow-y-auto overscroll-contain bg-card/95 backdrop-blur-sm shadow-lg p-3 text-sm`}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="font-bold">{m(L.title)}</span>
        {t.lines.length > 0 && (
          <span className="text-xs text-muted-foreground">{m(L.share)}: {share}%</span>
        )}
      </div>

      {d ? (
        <div className="rounded-md border border-border p-2 mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span>{m(L.newLine)}: {d.tiles.length} {m(L.stops)}{d.loop ? ' ↺' : ''}</span>
            <span className={money >= cost ? 'text-green-400' : 'text-red-400'}>{m(L.cost)}: ${cost}</span>
          </div>
          {errorText && <div className="text-xs text-red-400 mb-1">{m(errorText)}</div>}
          <div className="grid grid-cols-3 gap-1">
            <Button size="sm" variant="ghost" className="h-9" onClick={undoLineStop}>{m(L.undo)}</Button>
            <Button size="sm" variant="ghost" className="h-9" onClick={cancelLineDraft}>{m(L.cancel)}</Button>
            <Button size="sm" className="h-9" disabled={d.tiles.length < 2 || money < cost} onClick={finishLineDraft}>{m(L.create)}</Button>
          </div>
        </div>
      ) : (
        state.selectedTool === 'bus_line' && <div className="text-xs text-muted-foreground mb-2 leading-snug">{m(L.hint)}</div>
      )}

      {t.lines.length === 0 && !d && <div className="text-xs text-muted-foreground">{m(L.noLines)}</div>}

      <div className="flex flex-col gap-2">
        {t.lines.map(line => {
          const info = derived?.lineInfo.get(line.id);
          const headwayMin = info && isFinite(info.headway) ? Math.max(1, Math.round(info.headway * MINUTES_PER_TICK)) : null;
          const waiting = Math.round(line.stopIds.reduce((s, id) => s + waitingAt(t, id), 0));
          const myBuses = t.buses.filter(b => b.lineId === line.id);
          const onBoard = Math.round(myBuses.reduce((s, b) => s + busLoad(b), 0));
          const capacity = myBuses.length * BUS_CAPACITY;
          const riders = Math.round(t.lineBoardings[line.id] ?? 0);
          return (
            <div key={line.id} className="rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: line.color }} />
                <span className="font-semibold">{m(L.line)} {line.name}</span>
                <span className="text-xs text-muted-foreground">{line.stopIds.length} {m(L.stops)}{line.loop ? ' ↺' : ''}</span>
                <div className="ms-auto flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={line.buses <= 0} onClick={() => changeLineBuses(line.id, -1)}>-</Button>
                  <span className="text-xs w-12 text-center">{line.buses} {m(L.buses)}</span>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={money < BUS_PRICE} title={`$${BUS_PRICE}`} onClick={() => changeLineBuses(line.id, 1)}>+</Button>
                </div>
              </div>
              {line.broken && <div className="text-xs text-red-400 mt-1">{m(L.broken)}</div>}
              <div className="grid grid-cols-2 gap-x-2 text-xs text-muted-foreground mt-1">
                <span>{headwayMin ? m(L.every, { n: headwayMin }) : m(L.noBuses)}</span>
                <span>{m(L.riders)}: {riders}</span>
                <span className={waiting > BUS_CAPACITY ? 'text-red-400' : ''}>{m(L.waiting)}: {waiting}</span>
                <span>{m(L.load)}: {onBoard}/{capacity}</span>
              </div>
              <div className="flex justify-end mt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-7 px-2 text-xs ${confirmDelete === line.id ? 'text-red-400' : 'text-muted-foreground'}`}
                  onClick={() => {
                    if (confirmDelete === line.id) { removeLine(line.id); setConfirmDelete(null); }
                    else setConfirmDelete(line.id);
                  }}
                >
                  {m(confirmDelete === line.id ? L.confirm : L.remove)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {t.lines.length > 0 && (
        <div className="text-[11px] text-muted-foreground mt-2">{m(L.lost)}: {Math.round(t.today.lost)}</div>
      )}
    </Card>
  );
}

export default TransitPanel;
