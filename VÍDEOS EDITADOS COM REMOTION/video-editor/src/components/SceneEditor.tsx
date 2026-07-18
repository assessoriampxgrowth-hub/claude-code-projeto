'use client';
import { useState } from 'react';
import type { EditPlanScene } from '@/types';
import type { ColorGradingPreset } from '@/shared/remotion/types';
import { useEditor } from '@/store/EditorContext';
import { CAPTION_STYLES } from '@/services/captions/styles';

const SCENE_TYPES = [
  'hook', 'problem', 'solution', 'benefit', 'proof', 'cta', 'narration', 'title', 'transition',
] as const;

const ZOOM_OPTIONS = ['in', 'out', 'none'] as const;

const TRANSITION_OPTIONS = [
  'cut', 'fade',
  'slide-left', 'slide-right', 'slide-up', 'slide-down',
  'zoom-in', 'zoom-out',
  'wipe-left', 'wipe-right', 'wipe-down',
  'blur',
] as const;

const COLOR_GRADES: { value: ColorGradingPreset; label: string }[] = [
  { value: 'none', label: 'Nenhum' },
  { value: 'warm', label: 'Quente' },
  { value: 'cool', label: 'Frio' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'cinematic', label: 'Cinematico' },
  { value: 'dramatic', label: 'Dramatico' },
  { value: 'desaturated', label: 'Dessaturado' },
  { value: 'vivid', label: 'Vivido' },
];

const CAPTION_STYLE_NAMES = Object.keys(CAPTION_STYLES);

type Tab = 'scene' | 'captions' | 'effects';

export default function SceneEditor() {
  const { state, dispatch, selectedScene } = useEditor();
  const [tab, setTab] = useState<Tab>('scene');

  if (!selectedScene) return null;

  const update = (patch: Partial<EditPlanScene>) =>
    dispatch({
      type: 'UPDATE_SCENE',
      payload: { sceneId: selectedScene.id, updates: patch },
    });

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {(['scene', 'captions', 'effects'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
              tab === t
                ? 'text-yellow-400 border-b-2 border-yellow-500'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t === 'scene' ? 'Cena' : t === 'captions' ? 'Legendas' : 'Efeitos'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tab === 'scene' && (
          <SceneTab scene={selectedScene} update={update} />
        )}
        {tab === 'captions' && <CaptionsTab />}
        {tab === 'effects' && <EffectsTab />}
      </div>
    </div>
  );
}

// ─── Scene Tab ───

function SceneTab({
  scene,
  update,
}: {
  scene: EditPlanScene;
  update: (p: Partial<EditPlanScene>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Tipo">
        <select
          value={scene.type}
          onChange={(e) => update({ type: e.target.value })}
          className="input"
        >
          {SCENE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>

      <Field label="Titulo">
        <input
          value={scene.title}
          onChange={(e) => update({ title: e.target.value })}
          className="input"
        />
      </Field>

      <Field label="Subtitulo">
        <input
          value={scene.subtitle ?? ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className="input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Inicio (s)">
          <input
            type="number"
            step="0.1"
            value={scene.startTime}
            onChange={(e) => update({ startTime: parseFloat(e.target.value) || 0 })}
            className="input"
          />
        </Field>
        <Field label="Fim (s)">
          <input
            type="number"
            step="0.1"
            value={scene.endTime}
            onChange={(e) => update({ endTime: parseFloat(e.target.value) || 0 })}
            className="input"
          />
        </Field>
      </div>

      <Field label={`Enfase: ${Math.round(scene.emphasis * 100)}%`}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={scene.emphasis}
          onChange={(e) => update({ emphasis: parseFloat(e.target.value) })}
          className="w-full accent-yellow-500"
        />
      </Field>

      <Field label="Zoom">
        <div className="flex gap-2">
          {ZOOM_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => update({ zoomSuggestion: opt })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                scene.zoomSuggestion === opt
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Transicao In">
          <select
            value={scene.transitionIn ?? 'cut'}
            onChange={(e) => update({ transitionIn: e.target.value })}
            className="input text-xs"
          >
            {TRANSITION_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Transicao Out">
          <select
            value={scene.transitionOut ?? 'cut'}
            onChange={(e) => update({ transitionOut: e.target.value })}
            className="input text-xs"
          >
            {TRANSITION_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Prompt de Ilustracao">
        <textarea
          value={scene.illustrationPrompt ?? ''}
          onChange={(e) => update({ illustrationPrompt: e.target.value })}
          placeholder="Descreva a imagem para esta cena..."
          className="input text-xs resize-none h-16"
        />
      </Field>

      <div className="pt-2 border-t border-white/5">
        <p className="text-[10px] text-white/20">
          Duracao: {(scene.endTime - scene.startTime).toFixed(1)}s
        </p>
      </div>
    </div>
  );
}

// ─── Captions Tab ───

function CaptionsTab() {
  const { state, dispatch } = useEditor();

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        Escolha o estilo de legenda para o video inteiro:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {CAPTION_STYLE_NAMES.map((name) => {
          const s = CAPTION_STYLES[name];
          const active = state.captionStyleName === name;
          return (
            <button
              key={name}
              onClick={() =>
                dispatch({ type: 'SET_CAPTION_STYLE', payload: name })
              }
              className={`rounded-lg p-2 border transition-all ${
                active
                  ? 'border-yellow-500/50 bg-yellow-500/5'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div
                style={{
                  fontFamily: s.fontFamily,
                  fontWeight: s.fontWeight,
                  fontSize: 16,
                  color: s.highlightColor,
                  textTransform: s.uppercase ? 'uppercase' : 'none',
                }}
                className="mb-1 truncate"
              >
                Aa
              </div>
              <p className="text-[10px] text-white/50 truncate">{name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Effects Tab ───

function EffectsTab() {
  const { state, dispatch } = useEditor();
  const fx = state.effects;

  return (
    <div className="space-y-4">
      <Field label="Color Grading">
        <select
          value={fx.colorGrading}
          onChange={(e) =>
            dispatch({
              type: 'SET_EFFECTS',
              payload: { colorGrading: e.target.value as ColorGradingPreset },
            })
          }
          className="input"
        >
          {COLOR_GRADES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </Field>

      <Toggle
        label="Vinheta"
        checked={fx.vignette}
        onChange={(v) => dispatch({ type: 'SET_EFFECTS', payload: { vignette: v } })}
      />
      {fx.vignette && (
        <Field label={`Intensidade da Vinheta: ${Math.round(fx.vignetteIntensity * 100)}%`}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={fx.vignetteIntensity}
            onChange={(e) =>
              dispatch({
                type: 'SET_EFFECTS',
                payload: { vignetteIntensity: parseFloat(e.target.value) },
              })
            }
            className="w-full accent-yellow-500"
          />
        </Field>
      )}

      <Toggle
        label="Letterbox Cinematografico"
        checked={fx.letterbox}
        onChange={(v) => dispatch({ type: 'SET_EFFECTS', payload: { letterbox: v } })}
      />
      {fx.letterbox && (
        <Field label={`Proporcao: ${fx.letterboxRatio.toFixed(2)}:1`}>
          <input
            type="range"
            min="1.85"
            max="2.76"
            step="0.01"
            value={fx.letterboxRatio}
            onChange={(e) =>
              dispatch({
                type: 'SET_EFFECTS',
                payload: { letterboxRatio: parseFloat(e.target.value) },
              })
            }
            className="w-full accent-yellow-500"
          />
        </Field>
      )}
    </div>
  );
}

// ─── Helpers ───

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/40 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-1.5"
    >
      <span className="text-xs text-white/60">{label}</span>
      <div
        className={`w-10 h-5 rounded-full transition-colors relative ${
          checked ? 'bg-yellow-500' : 'bg-white/10'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}
