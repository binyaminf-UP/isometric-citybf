'use client';

import React, { useMemo } from 'react';
import { Tile, BuildingType, TOOL_INFO, Tool } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CloseIcon } from '@/components/ui/Icons';
import { useGame } from '@/context/GameContext';
import { translate as tr } from '@/i18n';
import { 
  SERVICE_CONFIG, 
  SERVICE_BUILDING_TYPES,
  SERVICE_MAX_LEVEL,
  SERVICE_RANGE_INCREASE_PER_LEVEL,
  SERVICE_UPGRADE_COST_BASE,
} from '@/lib/simulation';

interface TileInfoPanelProps {
  tile: Tile;
  services: {
    police: number[][];
    fire: number[][];
    health: number[][];
    education: number[][];
    power: boolean[][];
    water: boolean[][];
  };
  onClose: () => void;
  isMobile?: boolean;
}

export function TileInfoPanel({ 
  tile, 
  services, 
  onClose,
  isMobile = false
}: TileInfoPanelProps) {
  const { x, y } = tile;
  const { state, upgradeServiceBuilding } = useGame();
  
  // Check if this is a service building
  const isServiceBuilding = SERVICE_BUILDING_TYPES.has(tile.building.type);
  
  // Calculate upgrade cost and info for service buildings
  const upgradeInfo = useMemo(() => {
    if (!isServiceBuilding) return null;
    
    const buildingType = tile.building.type;
    // Service buildings are also Tools, so we can safely cast
    const baseCost = (TOOL_INFO as Record<string, { cost: number }>)[buildingType]?.cost ?? 0;
    const currentLevel = tile.building.level;
    
    if (currentLevel >= SERVICE_MAX_LEVEL) return null;
    
    const upgradeCost = baseCost * Math.pow(SERVICE_UPGRADE_COST_BASE, currentLevel);
    const canAfford = state.stats.money >= upgradeCost;
    const isUnderConstruction = tile.building.constructionProgress !== undefined && tile.building.constructionProgress < 100;
    const isAbandoned = tile.building.abandoned;
    
    // Get base range and calculate effective range
    const config = SERVICE_CONFIG[buildingType as keyof typeof SERVICE_CONFIG];
    const baseRange = config?.range ?? 0;
    const currentEffectiveRange = Math.floor(baseRange * (1 + (currentLevel - 1) * SERVICE_RANGE_INCREASE_PER_LEVEL));
    const nextEffectiveRange = Math.floor(baseRange * (1 + currentLevel * SERVICE_RANGE_INCREASE_PER_LEVEL));
    
    return {
      cost: upgradeCost,
      canAfford,
      isUnderConstruction,
      isAbandoned,
      currentLevel,
      maxLevel: SERVICE_MAX_LEVEL,
      baseRange,
      currentEffectiveRange,
      nextEffectiveRange,
    };
  }, [isServiceBuilding, tile.building, state.stats.money]);
  
  const handleUpgrade = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!upgradeInfo || !upgradeInfo.canAfford) return;
    const success = upgradeServiceBuilding(x, y);
    if (success) {
      // Optionally add notification here
    }
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <Card 
      className={`${isMobile ? 'fixed left-0 right-0 w-full rounded-none border-x-0 border-t border-b z-30' : 'absolute top-4 right-4 w-72 z-50'}`} 
      style={isMobile ? { top: 'calc(72px + env(safe-area-inset-top, 0px))' } : undefined}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-sans">{tr('Tile ({x}, {y})', { x, y })}</CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <CloseIcon size={14} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Building')}</span>
          <span className="capitalize">{tr(tile.building.type.replace(/_/g, ' '))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Zone')}</span>
          <Badge variant={
            tile.zone === 'residential' ? 'default' :
            tile.zone === 'commercial' ? 'secondary' :
            tile.zone === 'industrial' ? 'outline' : 'secondary'
          } className={
            tile.zone === 'residential' ? 'bg-green-500/20 text-green-400' :
            tile.zone === 'commercial' ? 'bg-blue-500/20 text-blue-400' :
            tile.zone === 'industrial' ? 'bg-amber-500/20 text-amber-400' : ''
          }>
            {tile.zone === 'none' ? tr('Unzoned') : tr(tile.zone)}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Level')}</span>
          <span>{tile.building.level}/5</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Population')}</span>
          <span>{tile.building.population}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Jobs')}</span>
          <span>{tile.building.jobs}</span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Power')}</span>
          <Badge variant={tile.building.powered ? 'default' : 'destructive'}>
            {tile.building.powered ? tr('Connected') : tr('No Power')}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Water')}</span>
          <Badge variant={tile.building.watered ? 'default' : 'destructive'} className={tile.building.watered ? 'bg-cyan-500/20 text-cyan-400' : ''}>
            {tile.building.watered ? tr('Connected') : tr('No Water')}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Land Value')}</span>
          <span>${tile.landValue}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tr('Pollution')}</span>
          <span className={tile.pollution > 50 ? 'text-red-400' : tile.pollution > 25 ? 'text-amber-400' : 'text-green-400'}>
            {Math.round(tile.pollution)}%
          </span>
        </div>
        
        {tile.building.onFire && (
          <>
            <Separator />
            <div className="flex justify-between text-red-400">
              <span>{tr('ON FIRE!')}</span>
              <span>{tr('{pct}% damage', { pct: Math.round(tile.building.fireProgress) })}</span>
            </div>
          </>
        )}
        
        <Separator />
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{tr('Service Coverage')}</div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tr('Police')}</span>
            <span>{Math.round(services.police[y][x])}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tr('Fire')}</span>
            <span>{Math.round(services.fire[y][x])}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tr('Health')}</span>
            <span>{Math.round(services.health[y][x])}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tr('Education')}</span>
            <span>{Math.round(services.education[y][x])}%</span>
          </div>
        </div>
        
        {upgradeInfo && (
          <>
            <Separator />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{tr('Upgrade')}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tr('Coverage Range')}</span>
                <span className="font-mono">
                  {tr('{from} → {to} tiles', { from: upgradeInfo.currentEffectiveRange, to: upgradeInfo.nextEffectiveRange })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tr('Upgrade Cost')}</span>
                <span className={`font-mono ${upgradeInfo.canAfford ? 'text-foreground' : 'text-red-400'}`}>
                  ${upgradeInfo.cost.toLocaleString()}
                </span>
              </div>
              <Button
                onClick={handleUpgrade}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!upgradeInfo.canAfford || upgradeInfo.isUnderConstruction || upgradeInfo.isAbandoned}
                className="w-full"
                size="sm"
              >
                {tr('Upgrade to Level {level}', { level: upgradeInfo.currentLevel + 1 })}
              </Button>
              {!upgradeInfo.canAfford && (
                <p className="text-xs text-muted-foreground text-center">
                  {tr('Insufficient funds')}
                </p>
              )}
              {upgradeInfo.isUnderConstruction && (
                <p className="text-xs text-muted-foreground text-center">
                  {tr('Building under construction')}
                </p>
              )}
              {upgradeInfo.isAbandoned && (
                <p className="text-xs text-muted-foreground text-center">
                  {tr('Building is abandoned')}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
