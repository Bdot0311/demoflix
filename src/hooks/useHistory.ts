import { useState, useCallback, useRef } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseHistoryOptions {
  maxHistory?: number;
}

export function useHistory<T>(
  initialState: T,
  options: UseHistoryOptions = {}
) {
  const { maxHistory = 50 } = options;
  
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // Track if we should skip the next state update (for external syncs)
  const skipNextRef = useRef(false);

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback(
    (newPresent: T | ((prev: T) => T), recordHistory = true) => {
      setState((currentState) => {
        const resolvedPresent =
          typeof newPresent === "function"
            ? (newPresent as (prev: T) => T)(currentState.present)
            : newPresent;

        // Don't record if the state hasn't changed
        if (JSON.stringify(resolvedPresent) === JSON.stringify(currentState.present)) {
          return currentState;
        }

        if (!recordHistory || skipNextRef.current) {
          skipNextRef.current = false;
          return {
            ...currentState,
            present: resolvedPresent,
          };
        }

        const newPast = [...currentState.past, currentState.present];
        // Limit history size
        if (newPast.length > maxHistory) {
          newPast.shift();
        }

        return {
          past: newPast,
          present: resolvedPresent,
          future: [], // Clear future on new change
        };
      });
    },
    [maxHistory]
  );

  const undo = useCallback(() => {
    setState((currentState) => {
      if (currentState.past.length === 0) return currentState;

      const previous = currentState.past[currentState.past.length - 1];
      const newPast = currentState.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [currentState.present, ...currentState.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((currentState) => {
      if (currentState.future.length === 0) return currentState;

      const next = currentState.future[0];
      const newFuture = currentState.future.slice(1);

      return {
        past: [...currentState.past, currentState.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: [],
    });
  }, []);

  // Skip the next state update from being recorded in history
  const skipNext = useCallback(() => {
    skipNextRef.current = true;
  }, []);

  return {
    state: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    skipNext,
    historyLength: state.past.length,
    futureLength: state.future.length,
  };
}
