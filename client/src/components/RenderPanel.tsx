import { Track, Preset } from '../types';

interface RenderPanelProps {
  tracks: Track[];
  preset: Preset;
  onRender: () => void;
  isRendering: boolean;
}

export default function RenderPanel({
  tracks,
  preset,
  onRender,
  isRendering,
}: RenderPanelProps) {
  const isValid = () => {
    if (tracks.length < 2 || tracks.length > 10) return false;
    return tracks.every((track) => track.audioFile && track.imageFile);
  };

  const getValidationMessage = () => {
    if (tracks.length < 2) {
      return 'Add at least 2 tracks';
    }
    if (tracks.length > 10) {
      return 'Maximum 10 tracks allowed';
    }
    const missingFiles = tracks.filter(
      (track) => !track.audioFile || !track.imageFile
    );
    if (missingFiles.length > 0) {
      return `${missingFiles.length} track(s) missing audio or image`;
    }
    return null;
  };

  const validationMessage = getValidationMessage();

  return (
    <div className="render-panel">
      <div className="render-info">
        <h2>Ready to Render</h2>
        <div className="render-summary">
          <p>
            <strong>Tracks:</strong> {tracks.length}
          </p>
          <p>
            <strong>Output:</strong> {preset.width}×{preset.height} @ {preset.fps}
            fps
          </p>
        </div>
      </div>

      {validationMessage && (
        <p className="validation-error">{validationMessage}</p>
      )}

      <button
        onClick={onRender}
        disabled={!isValid() || isRendering}
        className="btn btn-primary btn-large"
      >
        {isRendering ? 'Rendering...' : 'Render Video'}
      </button>
    </div>
  );
}

