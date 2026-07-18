'use client';
import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type { EditPlan, EditPlanScene } from '@/services/pipeline/types';
import type { CaptionBlock, ZoomInstruction, EffectsConfig } from '@/shared/remotion/types';
import { DEFAULT_EFFECTS } from '@/shared/remotion/types';

// ─── State ───

export interface EditorState {
  jobId: string;
  editPlan: EditPlan | null;
  captions: CaptionBlock[];
  zooms: ZoomInstruction[];
  effects: EffectsConfig;
  selectedSceneId: string | null;
  playbackPosition: number;
  captionStyleName: string;
  isLoading: boolean;
  isDirty: boolean;
}

const initialState: EditorState = {
  jobId: '',
  editPlan: null,
  captions: [],
  zooms: [],
  effects: DEFAULT_EFFECTS,
  selectedSceneId: null,
  playbackPosition: 0,
  captionStyleName: 'clean',
  isLoading: true,
  isDirty: false,
};

// ─── Actions ───

type EditorAction =
  | { type: 'LOAD_STATE'; payload: Partial<EditorState> }
  | { type: 'SET_EDIT_PLAN'; payload: EditPlan }
  | { type: 'UPDATE_SCENE'; payload: { sceneId: string; updates: Partial<EditPlanScene> } }
  | { type: 'REORDER_SCENES'; payload: EditPlanScene[] }
  | { type: 'DELETE_SCENE'; payload: string }
  | { type: 'ADD_SCENE'; payload: EditPlanScene }
  | { type: 'SET_CAPTIONS'; payload: CaptionBlock[] }
  | { type: 'SET_ZOOMS'; payload: ZoomInstruction[] }
  | { type: 'SET_EFFECTS'; payload: Partial<EffectsConfig> }
  | { type: 'SET_CAPTION_STYLE'; payload: string }
  | { type: 'SELECT_SCENE'; payload: string | null }
  | { type: 'SET_PLAYBACK_POSITION'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'MARK_CLEAN' };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_STATE': {
      // Strip undefined values so we never overwrite defaults with undefined
      const clean: Partial<EditorState> = {};
      for (const [k, v] of Object.entries(action.payload)) {
        if (v !== undefined) (clean as any)[k] = v;
      }
      return {
        ...state,
        ...clean,
        effects: clean.effects ?? state.effects ?? DEFAULT_EFFECTS,
        isLoading: false,
        isDirty: false,
      };
    }

    case 'SET_EDIT_PLAN':
      return { ...state, editPlan: action.payload, isDirty: true };

    case 'UPDATE_SCENE': {
      if (!state.editPlan) return state;
      const scenes = state.editPlan.scenes.map((s) =>
        s.id === action.payload.sceneId
          ? { ...s, ...action.payload.updates }
          : s
      );
      return {
        ...state,
        editPlan: { ...state.editPlan, scenes },
        isDirty: true,
      };
    }

    case 'REORDER_SCENES': {
      if (!state.editPlan) return state;
      return {
        ...state,
        editPlan: { ...state.editPlan, scenes: action.payload },
        isDirty: true,
      };
    }

    case 'DELETE_SCENE': {
      if (!state.editPlan) return state;
      return {
        ...state,
        editPlan: {
          ...state.editPlan,
          scenes: state.editPlan.scenes.filter((s) => s.id !== action.payload),
        },
        selectedSceneId:
          state.selectedSceneId === action.payload ? null : state.selectedSceneId,
        isDirty: true,
      };
    }

    case 'ADD_SCENE': {
      if (!state.editPlan) return state;
      return {
        ...state,
        editPlan: {
          ...state.editPlan,
          scenes: [...state.editPlan.scenes, action.payload],
        },
        isDirty: true,
      };
    }

    case 'SET_CAPTIONS':
      return { ...state, captions: action.payload, isDirty: true };

    case 'SET_ZOOMS':
      return { ...state, zooms: action.payload, isDirty: true };

    case 'SET_EFFECTS':
      return {
        ...state,
        effects: { ...state.effects, ...action.payload },
        isDirty: true,
      };

    case 'SET_CAPTION_STYLE':
      return { ...state, captionStyleName: action.payload, isDirty: true };

    case 'SELECT_SCENE':
      return { ...state, selectedSceneId: action.payload };

    case 'SET_PLAYBACK_POSITION':
      return { ...state, playbackPosition: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ─── Undo/Redo wrapper ───

interface UndoableState {
  present: EditorState;
  past: EditorState[];
  future: EditorState[];
}

type UndoableAction = EditorAction | { type: 'UNDO' } | { type: 'REDO' };

// Actions that should NOT create undo history
const NON_UNDOABLE = new Set([
  'SELECT_SCENE',
  'SET_PLAYBACK_POSITION',
  'SET_LOADING',
  'LOAD_STATE',
  'MARK_CLEAN',
]);

const MAX_HISTORY = 50;

function undoableReducer(state: UndoableState, action: UndoableAction): UndoableState {
  if (action.type === 'UNDO') {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  if (action.type === 'REDO') {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    };
  }

  const newPresent = editorReducer(state.present, action);
  if (newPresent === state.present) return state;

  // Non-undoable actions don't push to history
  if (NON_UNDOABLE.has(action.type)) {
    return { ...state, present: newPresent };
  }

  return {
    past: [...state.past.slice(-MAX_HISTORY), state.present],
    present: newPresent,
    future: [], // Clear future on new action
  };
}

// ─── Context ───

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<UndoableAction>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedScene: EditPlanScene | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  children,
  jobId,
}: {
  children: React.ReactNode;
  jobId: string;
}) {
  const [undoableState, dispatch] = useReducer(undoableReducer, {
    past: [],
    present: { ...initialState, jobId },
    future: [],
  });

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const state = undoableState.present;

  const selectedScene =
    state.editPlan?.scenes.find((s) => s.id === state.selectedSceneId) ?? null;

  // Auto-save debounced
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!state.isDirty || !state.jobId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        // Save editor state to server
        await fetch(`/api/jobs/${state.jobId}/editor-state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editPlan: state.editPlan,
            effects: state.effects,
            captionStyleName: state.captionStyleName,
          }),
        });
        dispatch({ type: 'MARK_CLEAN' });
      } catch {
        // Silent fail on auto-save
      }
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [state.isDirty, state.editPlan, state.effects, state.captionStyleName, state.jobId]);

  return (
    <EditorContext.Provider
      value={{
        state,
        dispatch,
        undo,
        redo,
        canUndo: undoableState.past.length > 0,
        canRedo: undoableState.future.length > 0,
        selectedScene,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return ctx;
}
