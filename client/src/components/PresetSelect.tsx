import { PRESETS } from '../types/index';
import type { Preset } from '../types/index';

interface PresetSelectProps {
  selectedPreset: Preset;
  onSelectPreset: (preset: Preset) => void;
}

export default function PresetSelect({
  selectedPreset,
  onSelectPreset,
}: PresetSelectProps) {
  return (
    <div className="preset-select">
      <h2>Output Preset</h2>
      <div className="preset-options">
        {PRESETS.map((preset) => (
          <label key={preset.name} className="preset-option">
            <input
              type="radio"
              name="preset"
              checked={selectedPreset.name === preset.name}
              onChange={() => onSelectPreset(preset)}
            />
            <span className="preset-label">
              <strong>{preset.name}</strong>
              <small>
                {preset.width}×{preset.height} @ {preset.fps}fps
              </small>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

