'use client';

import { visibleTools } from '@/lib/hiddenTools';
import React, { useState } from 'react';
import { msg, useMessages } from '@/i18n';
import { useGame } from '@/context/GameContext';
import { ZoneDensityPicker } from '@/components/game/ZoneDensityPicker';
import { Tool, TOOL_INFO } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CloseIcon,
  RoadIcon,
  RailIcon,
  SubwayIcon,
  TreeIcon,
  PowerIcon,
  WaterIcon,
  BudgetIcon,
  ChartIcon,
  AdvisorIcon,
  TrophyIcon,
  SettingsIcon,
  FireIcon,
  HealthIcon,
  EducationIcon,
  SafetyIcon,
} from '@/components/ui/Icons';

// Tool category icons
const CategoryIcons: Record<string, React.ReactNode> = {
  'TOOLS': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  'ZONES': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  'ZONING': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l16 16M20 4L4 20" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
  'SERVICES': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-4" />
      <path d="M9 9v.01" />
      <path d="M9 12v.01" />
      <path d="M9 15v.01" />
      <path d="M9 18v.01" />
    </svg>
  ),
  'PARKS': <TreeIcon size={20} />,
  'SPORTS': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M6 12h12" />
    </svg>
  ),
  'WATERFRONT': <WaterIcon size={20} />,
  'COMMUNITY': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'UTILITIES': <PowerIcon size={20} />,
  'SPECIAL': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

// Tool icons for quick access (Partial because not all tools need custom icons)
const QuickToolIcons: Partial<Record<Tool, React.ReactNode>> = {
  select: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 4l16 8-8 3-3 8z" />
    </svg>
  ),
  bulldoze: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M6 6v14a2 2 0 002 2h8a2 2 0 002-2V6M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
    </svg>
  ),
  road: <RoadIcon size={20} />,
  rail: <RailIcon size={20} />,
  subway: <SubwayIcon size={20} />,
  tree: <TreeIcon size={20} />,
  zone_residential: (
    <div className="w-5 h-5 rounded-sm bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">R</div>
  ),
  zone_commercial: (
    <div className="w-5 h-5 rounded-sm bg-gray-500 flex items-center justify-center text-[10px] font-bold text-white">C</div>
  ),
  zone_industrial: (
    <div className="w-5 h-5 rounded-sm bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white">I</div>
  ),
  zone_dezone: (
    <div className="w-5 h-5 rounded-sm bg-gray-500 flex items-center justify-center text-[10px] font-bold text-white">X</div>
  ),
  zone_water: (
    <div className="w-5 h-5 rounded-sm bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">~</div>
  ),
  zone_land: (
    <div className="w-5 h-5 rounded-sm bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">▲</div>
  ),
  police_station: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1l9 4v6c0 5.5-3.8 10.7-9 12-5.2-1.3-9-6.5-9-12V5l9-4z" />
    </svg>
  ),
  fire_station: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-1.5 4-1.5 6 0 8 1.5-2 1.5-4 0-8zM8 10c-2 4-2 6 0 10 2-4 2-6 0-10zM16 10c-2 4-2 6 0 10 2-4 2-6 0-10z" />
    </svg>
  ),
  hospital: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  school: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  university: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 20h20" />
      <path d="M5 20V8l7-4 7 4v12" />
      <path d="M9 20v-4h6v4" />
    </svg>
  ),
  park: <TreeIcon size={20} />,
  park_large: <TreeIcon size={20} />,
  tennis: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M4.5 4.5c5 5 10 5 15 0" />
      <path d="M4.5 19.5c5-5 10-5 15 0" />
    </svg>
  ),
  power_plant: <PowerIcon size={20} />,
  water_tower: <WaterIcon size={20} />,
  subway_station: <SubwayIcon size={20} />,
  stadium: <TrophyIcon size={20} />,
  museum: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 20h20" />
      <path d="M4 20v-6h4v6" />
      <path d="M10 20v-6h4v6" />
      <path d="M16 20v-6h4v6" />
      <path d="M2 14h20" />
      <path d="M12 3l10 7H2l10-7z" />
    </svg>
  ),
  airport: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  ),
  space_program: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4 5v6.5c0 6 5.5 10.5 8 11.5 2.5-1 8-5.5 8-11.5V5l-8-3z" />
    </svg>
  ),
  city_hall: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 20h20" />
      <path d="M4 20v-8l8-8 8 8v8" />
      <rect x="9" y="14" width="6" height="6" />
    </svg>
  ),
  amusement_park: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

// Category labels for translation
const CATEGORY_LABELS: Record<string, unknown> = {
  'TOOLS': msg('Tools'),
  'ZONES': msg('Zones'),
  'EXPAND_CITY': msg('Expand City'),
  'ZONING': msg('Zoning'),
  'UTILITIES': msg('Utilities'),
  'SERVICES': msg('Services'),
  'PARKS': msg('Parks'),
  'SPORTS': msg('Sports'),
  'WATERFRONT': msg('Waterfront'),
  'COMMUNITY': msg('Community'),
  'SPECIAL': msg('Special'),
};

// UI labels for translation
const UI_LABELS = {
  viewOverlays: msg('View Overlays'),
  none: msg('None'),
  power: msg('Power'),
  water: msg('Water'),
  fire: msg('Fire'),
  police: msg('Police'),
  health: msg('Health'),
  education: msg('Education'),
  subway: msg('Subway'),
  budget: msg('Budget'),
  statistics: msg('Statistics'),
  advisors: msg('Advisors'),
  settings: msg('Settings'),
};

// Bottom-bar pickers: Infrastructure (blue) and Public (brown).
const INFRA_TOOLS: Tool[] = visibleTools(['rail', 'rail_station', 'subway', 'subway_station', 'power_plant', 'water_tower']);

const PUBLIC_TABS: { key: string; label: unknown; tools: Tool[] }[] = [
  { key: 'safety', label: msg('Safety & Health'), tools: visibleTools(['police_station', 'fire_station', 'hospital']) },
  { key: 'edu', label: msg('Education & Community'), tools: visibleTools(['school', 'university', 'community_center', 'museum', 'city_hall', 'office_building_small', 'animal_pens_farm']) },
  { key: 'leisure', label: msg('Leisure'), tools: visibleTools(['tree', 'park', 'park_large', 'playground_small', 'playground_large', 'community_garden', 'tennis', 'basketball_courts', 'soccer_field_small', 'swimming_pool', 'campground', 'mountain_lodge']) },
  { key: 'landmarks', label: msg('Landmarks'), tools: visibleTools(['stadium', 'airport', 'space_program', 'amusement_park', 'roller_coaster_small', 'marina_docks_small', 'pier_large']) },
];

type PickerId = 'infra' | 'public';

type OverlayMode = 'none' | 'power' | 'water' | 'fire' | 'police' | 'health' | 'education' | 'subway' | 'zoning';

interface MobileToolbarProps {
  onOpenPanel: (panel: 'budget' | 'statistics' | 'advisors' | 'settings') => void;
  overlayMode?: OverlayMode;
  setOverlayMode?: (mode: OverlayMode) => void;
}

export function MobileToolbar({ onOpenPanel, overlayMode = 'none', setOverlayMode }: MobileToolbarProps) {
  const { state, setTool } = useGame();
  const { selectedTool, stats } = state;
  const [picker, setPicker] = useState<PickerId | null>(null);
  const [publicTab, setPublicTab] = useState(PUBLIC_TABS[0].key);
  const [showMenu, setShowMenu] = useState(false);
  const m = useMessages();

  const togglePicker = (id: PickerId) => {
    setShowMenu(false);
    if (picker !== id) setTool('select');
    setPicker(picker === id ? null : id);
  };

  const handleToolSelect = (tool: Tool, closeMenu: boolean = false) => {
    // If the tool is already selected and it's not 'select', toggle back to select
    if (selectedTool === tool && tool !== 'select') {
      setTool('select');
    } else {
      setTool(tool);
    }
    setPicker(null);
    if (closeMenu) {
      setShowMenu(false);
    }
  };

  return (
    <>
      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <Card className="rounded-none border-x-0 border-b-0 bg-card/95 backdrop-blur-sm">
          {/* Selected tool info - now above the toolbar */}
          {selectedTool && TOOL_INFO[selectedTool] && (
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-sidebar-border/50 bg-secondary/30 text-xs">
              <span className="text-foreground font-medium">
                {m(TOOL_INFO[selectedTool].name)}
              </span>
              {TOOL_INFO[selectedTool].cost > 0 && (
                <span className={`font-mono ${stats.money >= TOOL_INFO[selectedTool].cost ? 'text-green-400' : 'text-red-400'}`}>
                  ${TOOL_INFO[selectedTool].cost}
                </span>
              )}
            </div>
          )}

          {/* Residential designation picker */}
          {selectedTool === 'zone_residential' && (
            <div className="border-b border-sidebar-border/50">
              <ZoneDensityPicker compact />
            </div>
          )}

          <div className="flex items-center justify-between px-1 py-2 gap-0.5">
            {/* Quick access tools */}
            <Button
              variant={selectedTool === 'select' && !picker ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => handleToolSelect('select')}
            >
              {QuickToolIcons.select}
            </Button>

            <Button
              variant={selectedTool === 'bulldoze' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0 text-red-400"
              onClick={() => handleToolSelect('bulldoze')}
            >
              {QuickToolIcons.bulldoze}
            </Button>

            <Button
              variant={selectedTool === 'road' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => handleToolSelect('road')}
            >
              {QuickToolIcons.road}
            </Button>

            <Button
              variant={selectedTool === 'bus_line' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => handleToolSelect('bus_line')}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="3" width="14" height="15" rx="2" />
                <path d="M5 11h14M8 21v-3M16 21v-3" />
                <circle cx="8.5" cy="14.5" r="0.8" fill="currentColor" />
                <circle cx="15.5" cy="14.5" r="0.8" fill="currentColor" />
              </svg>
            </Button>

            <Button
              variant={picker === 'infra' || INFRA_TOOLS.includes(selectedTool) ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => togglePicker('infra')}
            >
              <div className="w-5 h-5 rounded-sm bg-blue-500 flex items-center justify-center text-white">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>
              </div>
            </Button>

            {/* Zone buttons */}
            <Button
              variant={selectedTool === 'zone_residential' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => handleToolSelect('zone_residential')}
            >
              {QuickToolIcons.zone_residential}
            </Button>

            <Button
              variant={selectedTool === 'zone_commercial' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => handleToolSelect('zone_commercial')}
            >
              {QuickToolIcons.zone_commercial}
            </Button>

            <Button
              variant={selectedTool === 'zone_industrial' ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => handleToolSelect('zone_industrial')}
            >
              {QuickToolIcons.zone_industrial}
            </Button>

            <Button
              variant={picker === 'public' || PUBLIC_TABS.some((t) => t.tools.includes(selectedTool)) ? 'default' : 'ghost'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => togglePicker('public')}
            >
              <div className="w-5 h-5 rounded-sm bg-amber-800 flex items-center justify-center text-[10px] font-bold text-white">P</div>
            </Button>

            {/* More tools menu button */}
            <Button
              variant={showMenu ? 'default' : 'secondary'}
              size="icon"
              className="h-11 w-auto min-w-0 flex-1 max-w-11 px-0"
              onClick={() => { setPicker(null); setShowMenu(!showMenu); }}
            >
              {showMenu ? (
                <CloseIcon size={20} />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Infrastructure / Public picker */}
      {picker && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setPicker(null)}>
          <Card
            className="absolute bottom-24 left-2 right-2 max-h-[65vh] overflow-hidden rounded-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 pt-3 pb-1 text-xs text-muted-foreground uppercase tracking-wider flex-shrink-0">
              {picker === 'infra' ? m(msg('Infrastructure')) : m(msg('Public'))}
            </div>
            <div className="overflow-y-auto overscroll-contain p-2 pt-0">
              <div className="grid grid-cols-3 gap-1.5">
                {(picker === 'infra' ? INFRA_TOOLS : (PUBLIC_TABS.find((t) => t.key === publicTab)?.tools ?? [])).map((tool) => {
                  const info = TOOL_INFO[tool];
                  if (!info) return null;
                  const canAfford = stats.money >= info.cost;
                  return (
                    <Button
                      key={tool}
                      variant={selectedTool === tool ? 'default' : 'outline'}
                      className="h-auto min-h-14 flex-col gap-0.5 px-1 py-1.5 whitespace-normal text-center"
                      disabled={!canAfford && info.cost > 0}
                      onClick={() => handleToolSelect(tool)}
                    >
                      <span className="text-xs leading-tight">{m(info.name)}</span>
                      {info.cost > 0 && (
                        <span className={`text-[10px] font-mono ${canAfford ? 'text-green-400' : 'text-red-400'}`}>${info.cost}</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
            {picker === 'public' && (
              <div className="grid grid-cols-4 gap-1 px-2 pt-2 pb-2 flex-shrink-0 border-t border-border">
                {PUBLIC_TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    variant={publicTab === tab.key ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-auto min-h-9 px-1 py-1 text-[11px] leading-tight whitespace-normal"
                    onClick={() => setPublicTab(tab.key)}
                  >
                    {m(tab.label as Parameters<typeof m>[0])}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Expanded Tool Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <Card
            className="absolute bottom-20 left-2 right-2 max-h-[70vh] overflow-hidden rounded-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* City Management section at top */}
            <div className="p-3 border-b border-border flex-shrink-0">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                {m(msg('City Management'))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { onOpenPanel('budget'); setShowMenu(false); }}
                >
                  {m(UI_LABELS.budget)}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { onOpenPanel('statistics'); setShowMenu(false); }}
                >
                  {m(UI_LABELS.statistics)}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { onOpenPanel('advisors'); setShowMenu(false); }}
                >
                  {m(UI_LABELS.advisors)}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-full text-xs"
                  onClick={() => { onOpenPanel('settings'); setShowMenu(false); }}
                >
                  {m(UI_LABELS.settings)}
                </Button>
              </div>
            </div>

            {/* Overlay Toggle Section */}
            {setOverlayMode && (
              <div className="p-3 border-b border-border flex-shrink-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  {m(UI_LABELS.viewOverlays)}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={overlayMode === 'none' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-10 w-full text-xs"
                    onClick={() => setOverlayMode('none')}
                  >
                    {m(UI_LABELS.none)}
                  </Button>
                  <Button
                    variant={overlayMode === 'power' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'power' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                    onClick={() => setOverlayMode('power')}
                  >
                    {m(UI_LABELS.power)}
                  </Button>
                  <Button
                    variant={overlayMode === 'water' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'water' ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                    onClick={() => setOverlayMode('water')}
                  >
                    {m(UI_LABELS.water)}
                  </Button>
                  <Button
                    variant={overlayMode === 'fire' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'fire' ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    onClick={() => setOverlayMode('fire')}
                  >
                    {m(UI_LABELS.fire)}
                  </Button>
                  <Button
                    variant={overlayMode === 'police' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'police' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                    onClick={() => setOverlayMode('police')}
                  >
                    {m(UI_LABELS.police)}
                  </Button>
                  <Button
                    variant={overlayMode === 'health' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'health' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    onClick={() => setOverlayMode('health')}
                  >
                    {m(UI_LABELS.health)}
                  </Button>
                  <Button
                    variant={overlayMode === 'education' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'education' ? 'bg-purple-500 hover:bg-purple-600' : ''}`}
                    onClick={() => setOverlayMode('education')}
                  >
                    {m(UI_LABELS.education)}
                  </Button>
                  <Button
                    variant={overlayMode === 'subway' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'subway' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                    onClick={() => setOverlayMode('subway')}
                  >
                    {m(UI_LABELS.subway)}
                  </Button>
                  <Button
                    variant={overlayMode === 'zoning' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-10 w-full text-xs ${overlayMode === 'zoning' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    onClick={() => setOverlayMode('zoning')}
                  >
                    {m(msg('Zoning'))}
                  </Button>
                </div>
              </div>
            )}

          </Card>
        </div>
      )}
    </>
  );
}

export default MobileToolbar;
