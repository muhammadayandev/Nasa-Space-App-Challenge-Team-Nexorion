import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SoundEngine } from './audio/soundEngine';
import { CutsceneHUD } from './components/CutsceneHUD';
import { ModalOverlay } from './components/ModalOverlay';
import { TitleOverlay } from './components/TitleOverlay';
import { createInitialObjectives, type ChapterId, type GamePhase } from './timeline';
import { CutsceneEngine, type EngineHudSnapshot } from './scene/CutsceneEngine';

const INITIAL_HUD: EngineHudSnapshot = {
  phase: 'title',
  chapterId: 'earth_farewell',
  chapterIndex: 1,
  chapterTitle: 'Launch Complex Departure',
  location: 'Kennedy Orbital Complex · Launch Wing B',
  localTime: 0,
  localProgress: 0,
  totalProgress: 0,
  subtitleSpeaker: null,
  subtitleText: null,
  subtitleTone: 'normal',
  countdownNumber: 5,
  ignited: false,
  altitudeKm: 0,
  velocityKms: 0,
  transitMonths: 0,
  transitDays: 0,
  transitDistanceMkm: 0,
  transitPercent: 0,
  solNumber: 0,
  stormAlertActive: false,
  commsLost: false,
  blackoutOpacity: 0,
  helmetCracked: false,
  objectives: createInitialObjectives(),
  waypoints: [],
  survivalElapsedSec: 0,
  oxygenPercent: 42,
};

interface IntroCutsceneProps {
  autostart?: boolean;
  muted: boolean;
  onSyncMuted: (muted: boolean) => void;
  onComplete: () => void;
}

export const IntroCutscene: React.FC<IntroCutsceneProps> = ({
  autostart = false,
  muted,
  onSyncMuted,
  onComplete,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CutsceneEngine | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [hud, setHud] = useState<EngineHudSnapshot>(INITIAL_HUD);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;
    completedRef.current = false;

    const sound = new SoundEngine();
    sound.setMuted(muted);
    soundRef.current = sound;

    const unlockOnce = () => sound.unlock(true);
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });

    const engine = new CutsceneEngine(mount, sound, (snapshot) => {
      // Hand off cleanly to the main game as soon as the cutscene ends or is skipped
      if (snapshot.phase === 'survival') {
        if (!completedRef.current) {
          completedRef.current = true;
          sound.silenceLoops();
          onCompleteRef.current();
        }
        return;
      }
      setHud(snapshot);
    });
    engineRef.current = engine;

    if (autostart) {
      engine.startCutscene(true);
    }

    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
      engine.dispose();
      engineRef.current = null;
      sound.silenceLoops();
      soundRef.current = null;
    };
  }, [autostart]);

  useEffect(() => {
    soundRef.current?.setMuted(muted);
  }, [muted]);

  const handleStart = useCallback(() => {
    soundRef.current?.unlock(true);
    engineRef.current?.startCutscene(true);
  }, []);

  const handleSkip = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    soundRef.current?.silenceLoops();
    onCompleteRef.current();
  }, []);

  const handleJumpChapter = useCallback((id: ChapterId) => {
    soundRef.current?.unlock(true);
    engineRef.current?.jumpToChapter(id);
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleResume = useCallback(() => {
    soundRef.current?.unlock(true);
    engineRef.current?.resume();
  }, []);

  const handleReturnTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    const sound = soundRef.current;
    if (!sound) return;
    sound.unlock(true);
    const next = !sound.isMuted();
    sound.setMuted(next);
    onSyncMuted(next);
  }, [onSyncMuted]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (hud.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStart();
        return;
      }
      if (hud.phase === 'cutscene' && e.code === 'KeyS') {
        e.preventDefault();
        handleSkip();
        return;
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        const p: GamePhase = hud.phase;
        if (p === 'cutscene') {
          e.preventDefault();
          handlePause();
        } else if (p === 'paused') {
          e.preventDefault();
          handleResume();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.phase, handleStart, handleSkip, handleToggleMute, handlePause, handleResume]);

  return (
    <div className="fixed inset-0 z-30 overflow-hidden bg-[#090a0d]">
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full z-0" />

      {hud.phase === 'title' && (
        <TitleOverlay
          muted={muted}
          onStart={handleStart}
          onSkipToMars={handleSkip}
          onToggleMute={handleToggleMute}
        />
      )}

      {hud.phase === 'cutscene' && (
        <CutsceneHUD
          hud={hud}
          muted={muted}
          onSkip={handleSkip}
          onJumpChapter={handleJumpChapter}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
        />
      )}

      {(hud.phase === 'paused' || hud.phase === 'complete') && (
        <ModalOverlay
          mode={hud.phase}
          hud={hud}
          onResume={handleResume}
          onReplayCutscene={handleStart}
          onReturnTitle={handleReturnTitle}
        />
      )}
    </div>
  );
};
