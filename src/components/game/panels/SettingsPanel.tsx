'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { msg, useMessages } from '@/i18n';
import { useGame, DayNightMode } from '@/context/GameContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SpriteTestPanel } from './SpriteTestPanel';
import { SavedCityMeta } from '@/types/game';

// Translatable UI labels
const UI_LABELS = {
  settings: msg('Settings'),
  gameSettings: msg('Game Settings'),
  disasters: msg('Disasters'),
  disastersDesc: msg('Enable random fires and disasters'),
  spritePack: msg('Sprite Pack'),
  spritePackDesc: msg('Choose building artwork style'),
  language: msg('Language'),
  languageDesc: msg('Choose your preferred language'),
  cityInformation: msg('City Information'),
  cityName: msg('City Name'),
  gridSize: msg('Grid Size'),
  autoSave: msg('Auto-Save'),
  enabled: msg('Enabled'),
  expandCity: msg('Expand City (+30x30)'),
  expandCityDesc: msg('Add 15 tiles on each side. Land edges extend as land, water edges extend as water.'),
  shrinkCity: msg('Shrink City (-30x30)'),
  shrinkCityDesc: msg('Remove 15 tiles from each edge. Buildings on edges will be deleted.'),
  savedCities: msg('Saved Cities'),
  savedCitiesDesc: msg('Save multiple cities and switch between them'),
  citySaved: msg('City Saved!'),
  save: msg('Save'),
  newCityName: msg('New city name...'),
  cancel: msg('Cancel'),
  deleteThisCity: msg('Delete this city?'),
  delete: msg('Delete'),
  current: msg('(current)'),
  pop: msg('Pop'),
  saved: msg('Saved'),
  load: msg('Load'),
  rename: msg('Rename'),
  noSavedCities: msg('No saved cities yet.'),
  restore: msg('Restore'),
  citySavedBeforeViewing: msg('Your city was saved before viewing a shared city'),
  startNewGame: msg('Start New Game'),
  confirmReset: msg('Are you sure? This will reset all progress.'),
  reset: msg('Reset'),
  exportGame: msg('Export Game'),
  exportGameDesc: msg('Copy your game state to share or backup'),
  copied: msg('Copied!'),
  copyGameState: msg('Copy Game State'),
  importGame: msg('Import Game'),
  importGameDesc: msg('Paste a game state to load it'),
  pasteGameState: msg('Paste game state here...'),
  invalidGameState: msg('Invalid game state. Please check and try again.'),
  gameLoadedSuccess: msg('Game loaded successfully!'),
  loadGameState: msg('Load Game State'),
  developerTools: msg('Developer Tools'),
  openSpriteTestView: msg('Open Sprite Test View'),
  loadExampleState: msg('Load Example State'),
  dayNightMode: msg('Day/Night Mode'),
  dayNightModeDesc: msg('Override the time-of-day appearance without affecting time progression'),
  auto: msg('Auto'),
  day: msg('Day'),
  night: msg('Night'),
  cannotShrink: msg('Cannot shrink city further - minimum size reached.'),
};

// Format a date for display
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Format population for display
function formatPopulation(pop: number): string {
  if (pop >= 1000000) return `${(pop / 1000000).toFixed(1)}M`;
  if (pop >= 1000) return `${(pop / 1000).toFixed(1)}K`;
  return pop.toString();
}

// Helper function to load example state with proper error handling
async function loadExampleState(
  filename: string,
  loadState: (stateString: string) => boolean,
  setActivePanel: (panel: 'none' | 'budget' | 'statistics' | 'advisors' | 'settings') => void
): Promise<void> {
  try {
    const response = await fetch(`/example-states/${filename}`);
    if (!response.ok) {
      console.error(`Failed to fetch ${filename}:`, response.status);
      alert(`Failed to load example state: ${response.status}`);
      return;
    }
    const exampleState = await response.json();
    const success = loadState(JSON.stringify(exampleState));
    if (success) {
      setActivePanel('none');
    } else {
      console.error('loadState returned false - invalid state format for', filename);
      alert('Failed to load example state: invalid format');
    }
  } catch (e) {
    console.error('Error loading example state:', e);
    alert(`Error loading example state: ${e}`);
  }
}

// Format money for display
function formatMoney(money: number): string {
  if (money >= 1000000) return `$${(money / 1000000).toFixed(1)}M`;
  if (money >= 1000) return `$${(money / 1000).toFixed(1)}K`;
  return `$${money}`;
}

export function SettingsPanel() {
  const { state, setActivePanel, setDisastersEnabled, newGame, loadState, exportState, expandCity, shrinkCity, currentSpritePack, availableSpritePacks, setSpritePack, dayNightMode, setDayNightMode, getSavedCityInfo, restoreSavedCity, clearSavedCity, savedCities, saveCity, loadSavedCity, deleteSavedCity, renameSavedCity } = useGame();
  const { disastersEnabled, cityName, gridSize, id: currentCityId } = state;
  const m = useMessages();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newCityName, setNewCityName] = useState(cityName);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [saveCitySuccess, setSaveCitySuccess] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<SavedCityMeta | null>(null);
  const [cityToRename, setCityToRename] = useState<SavedCityMeta | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [importValue, setImportValue] = useState('');
  const [exportCopied, setExportCopied] = useState(false);
  const [importError, setImportError] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [savedCityInfo, setSavedCityInfo] = useState(getSavedCityInfo());
  
  // Refresh saved city info when panel opens
  React.useEffect(() => {
    setSavedCityInfo(getSavedCityInfo());
  }, [getSavedCityInfo]);
  
  // Initialize showSpriteTest from query parameter
  const spriteTestFromUrl = searchParams?.get('spriteTest') === 'true';
  const [showSpriteTest, setShowSpriteTest] = useState(spriteTestFromUrl);
  const lastUrlValueRef = useRef(spriteTestFromUrl);
  const isUpdatingFromStateRef = useRef(false);
  
  // Sync state with query parameter when URL changes externally
  useEffect(() => {
    const spriteTestParam = searchParams?.get('spriteTest') === 'true';
    // Only update if URL value actually changed and we're not updating from state
    if (spriteTestParam !== lastUrlValueRef.current && !isUpdatingFromStateRef.current) {
      lastUrlValueRef.current = spriteTestParam;
      setTimeout(() => setShowSpriteTest(spriteTestParam), 0);
    }
  }, [searchParams]);
  
  // Sync query parameter when showSpriteTest changes (but avoid loops)
  useEffect(() => {
    const currentParam = searchParams?.get('spriteTest') === 'true';
    if (currentParam === showSpriteTest) return; // Already in sync
    
    isUpdatingFromStateRef.current = true;
    lastUrlValueRef.current = showSpriteTest;
    
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (showSpriteTest) {
      params.set('spriteTest', 'true');
    } else {
      params.delete('spriteTest');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
    
    // Reset flag after URL update
    setTimeout(() => {
      isUpdatingFromStateRef.current = false;
    }, 0);
  }, [showSpriteTest, searchParams, router]);
  
  const handleCopyExport = async () => {
    const exported = exportState();
    await navigator.clipboard.writeText(exported);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };
  
  const handleImport = () => {
    setImportError(false);
    setImportSuccess(false);
    if (importValue.trim()) {
      const success = loadState(importValue.trim());
      if (success) {
        setImportSuccess(true);
        setImportValue('');
        setTimeout(() => setImportSuccess(false), 2000);
      } else {
        setImportError(true);
      }
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={() => setActivePanel('none')}>
      <DialogContent className="max-w-[400px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m(UI_LABELS.settings)}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">{m(UI_LABELS.gameSettings)}</div>
            
            <div className="flex items-center justify-between py-2 gap-4">
              <div className="flex-1 min-w-0">
                <Label>{m(UI_LABELS.disasters)}</Label>
                <p className="text-muted-foreground text-xs">{m(UI_LABELS.disastersDesc)}</p>
              </div>
              <Switch
                checked={disastersEnabled}
                onCheckedChange={setDisastersEnabled}
              />
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">{m(UI_LABELS.cityInformation)}</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{m(UI_LABELS.cityName)}</span>
                <span className="text-foreground">{cityName}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{m(UI_LABELS.gridSize)}</span>
                <span className="text-foreground">{gridSize} x {gridSize}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{m(UI_LABELS.autoSave)}</span>
                <span className="text-green-400">{m(UI_LABELS.enabled)}</span>
              </div>
            </div>
            
            <div className="mt-4 space-y-3">
              <div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    expandCity();
                  }}
                >
                  {m(UI_LABELS.expandCity)}
                </Button>
                <p className="text-muted-foreground text-xs mt-1 text-center">
                  {m(UI_LABELS.expandCityDesc)}
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Saved Cities Section */}
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">{m(UI_LABELS.savedCities)}</div>
            <p className="text-muted-foreground text-xs mb-3">{m(UI_LABELS.savedCitiesDesc)}</p>
            
            {/* Save Current City Button */}
            <Button
              variant="default"
              className="w-full mb-3"
              onClick={() => {
                saveCity();
                setSaveCitySuccess(true);
                setTimeout(() => setSaveCitySuccess(false), 2000);
              }}
            >
              {saveCitySuccess ? `✓ ${m(UI_LABELS.citySaved)}` : `${m(UI_LABELS.save)} "${cityName}"`}
            </Button>
            
            {/* Saved Cities List */}
            {savedCities.length > 0 ? (
              <div 
                className="space-y-2 max-h-[200px] overflow-y-auto overscroll-y-contain"
                style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
              >
                {savedCities.map((city) => (
                  <div
                    key={city.id}
                    className={`p-3 rounded-md border transition-colors ${
                      city.id === currentCityId
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    {cityToRename?.id === city.id ? (
                      <div className="space-y-2">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          placeholder={String(m(UI_LABELS.newCityName))}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              setCityToRename(null);
                              setRenameValue('');
                            }}
                          >
                            {m(UI_LABELS.cancel)}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              if (renameValue.trim()) {
                                renameSavedCity(city.id, renameValue.trim());
                              }
                              setCityToRename(null);
                              setRenameValue('');
                            }}
                          >
                            {m(UI_LABELS.save)}
                          </Button>
                        </div>
                      </div>
                    ) : cityToDelete?.id === city.id ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground text-center">{m(UI_LABELS.deleteThisCity)}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => setCityToDelete(null)}
                          >
                            {m(UI_LABELS.cancel)}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              deleteSavedCity(city.id);
                              setCityToDelete(null);
                            }}
                          >
                            {m(UI_LABELS.delete)}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-medium text-sm truncate flex-1">
                            {city.cityName}
                            {city.id === currentCityId && (
                              <span className="ml-2 text-[10px] text-primary">{m(UI_LABELS.current)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <span>{m(UI_LABELS.pop)}: {formatPopulation(city.population)}</span>
                          <span>{formatMoney(city.money)}</span>
                          <span>{city.gridSize}×{city.gridSize}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mb-2">
                          {m(UI_LABELS.saved)} {formatDate(city.savedAt)}
                        </div>
                        <div className="flex gap-2">
                          {city.id !== currentCityId && (
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 h-7 text-xs"
                              onClick={() => {
                                loadSavedCity(city.id);
                                setActivePanel('none');
                              }}
                            >
                              {m(UI_LABELS.load)}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              setCityToRename(city);
                              setRenameValue(city.cityName);
                            }}
                          >
                            {m(UI_LABELS.rename)}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setCityToDelete(city)}
                          >
                            {m(UI_LABELS.delete)}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs text-center py-3 border border-dashed rounded-md">
                {m(UI_LABELS.noSavedCities)}
              </p>
            )}
          </div>
          
          {/* Restore saved city button - shown if there's a saved city from before viewing a shared city */}
          {savedCityInfo && (
            <div className="space-y-2">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  restoreSavedCity();
                  setSavedCityInfo(null);
                  setActivePanel('none');
                }}
              >
                {m(UI_LABELS.restore)} {savedCityInfo.cityName}
              </Button>
              <p className="text-muted-foreground text-xs text-center">
                {m(UI_LABELS.citySavedBeforeViewing)}
              </p>
              <Separator />
            </div>
          )}
          
          {!showNewGameConfirm ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowNewGameConfirm(true)}
            >
              {m(UI_LABELS.startNewGame)}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm text-center">{m(UI_LABELS.confirmReset)}</p>
              <Input
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder={String(m(UI_LABELS.newCityName))}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewGameConfirm(false)}
                >
                  {m(UI_LABELS.cancel)}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    newGame(newCityName || 'New City', gridSize);
                    setActivePanel('none');
                  }}
                >
                  {m(UI_LABELS.reset)}
                </Button>
              </div>
            </div>
          )}
          
          <Separator />
          
          <div>
            <div>
              <Label>{m(UI_LABELS.dayNightMode)}</Label>
              <p className="text-muted-foreground text-xs mb-2">{m(UI_LABELS.dayNightModeDesc)}</p>
              <div className="flex rounded-md border border-border overflow-hidden">
                {(['auto', 'day', 'night'] as DayNightMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDayNightMode(mode)}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                      dayNightMode === mode
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {mode === 'auto' && m(UI_LABELS.auto)}
                    {mode === 'day' && m(UI_LABELS.day)}
                    {mode === 'night' && m(UI_LABELS.night)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {showSpriteTest && (
        <SpriteTestPanel onClose={() => {
          setShowSpriteTest(false);
          // Query param will be cleared by useEffect above
        }} />
      )}
    </Dialog>
  );
}
