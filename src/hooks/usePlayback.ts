import { useState, useEffect, useCallback, useRef } from "react";

interface Scene {
  id: string;
  duration_ms: number;
}

interface UsePlaybackProps {
  scenes: Scene[];
  onSceneChange?: (sceneId: string) => void;
}

interface UsePlaybackReturn {
  isPlaying: boolean;
  currentTime: number;
  currentSceneIndex: number;
  currentSceneProgress: number;
  totalDuration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (timeMs: number) => void;
  seekToScene: (sceneIndex: number) => void;
  reset: () => void;
}

export const usePlayback = ({ scenes, onSceneChange }: UsePlaybackProps): UsePlaybackReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const previousSceneIndexRef = useRef<number>(-1);

  const totalDuration = scenes.reduce((acc, scene) => acc + scene.duration_ms, 0);

  // Calculate which scene is active based on current time
  const getCurrentSceneIndex = useCallback((time: number): number => {
    let accumulated = 0;
    for (let i = 0; i < scenes.length; i++) {
      accumulated += scenes[i].duration_ms;
      if (time < accumulated) {
        return i;
      }
    }
    return Math.max(0, scenes.length - 1);
  }, [scenes]);

  // Calculate progress within the current scene (0-1)
  const getSceneProgress = useCallback((time: number, sceneIndex: number): number => {
    let startTime = 0;
    for (let i = 0; i < sceneIndex; i++) {
      startTime += scenes[i].duration_ms;
    }
    const sceneTime = time - startTime;
    const sceneDuration = scenes[sceneIndex]?.duration_ms || 1;
    return Math.min(1, Math.max(0, sceneTime / sceneDuration));
  }, [scenes]);

  const currentSceneIndex = getCurrentSceneIndex(currentTime);
  const currentSceneProgress = getSceneProgress(currentTime, currentSceneIndex);

  // Notify when scene changes
  useEffect(() => {
    if (currentSceneIndex !== previousSceneIndexRef.current && scenes[currentSceneIndex]) {
      previousSceneIndexRef.current = currentSceneIndex;
      onSceneChange?.(scenes[currentSceneIndex].id);
    }
  }, [currentSceneIndex, scenes, onSceneChange]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying || scenes.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0; // Loop back to start
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, totalDuration, scenes.length]);

  const play = useCallback(() => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0);
    }
    setIsPlaying(true);
  }, [currentTime, totalDuration]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback((timeMs: number) => {
    setCurrentTime(Math.max(0, Math.min(timeMs, totalDuration)));
  }, [totalDuration]);

  const seekToScene = useCallback((sceneIndex: number) => {
    let startTime = 0;
    for (let i = 0; i < sceneIndex && i < scenes.length; i++) {
      startTime += scenes[i].duration_ms;
    }
    setCurrentTime(startTime);
  }, [scenes]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    previousSceneIndexRef.current = -1;
  }, []);

  return {
    isPlaying,
    currentTime,
    currentSceneIndex,
    currentSceneProgress,
    totalDuration,
    play,
    pause,
    toggle,
    seek,
    seekToScene,
    reset,
  };
};
