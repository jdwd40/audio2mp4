import { useRef, useEffect } from 'react';
import type { Track, Preset } from '../types/index';

interface RenderPanelProps {
  tracks: Track[];
  preset: Preset;
  onRender: () => void;
  isRendering: boolean;
  logs?: string[];
  progress?: { step: string; index?: number; total?: number } | null;
  downloadUrl?: string | null;
  error?: string | null;
}

export default function RenderPanel({
  tracks,
  preset,
  onRender,
  isRendering,
  logs = [],
  progress,
  downloadUrl,
  error,
}: RenderPanelProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);
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
  
  const getProgressMessage = () => {
    if (!progress) return null;
    if (progress.step === 'segment' && progress.index !== undefined && progress.total) {
      return `Processing segment ${progress.index + 1} of ${progress.total}...`;
    }
    if (progress.step === 'concat') {
      return 'Concatenating segments...';
    }
    return null;
  };

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
      
      {/* Progress indicator */}
      {progress && (
        <div className="progress-status" role="status" aria-live="polite">
          <p className="progress-message">{getProgressMessage()}</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="error-message" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Log output */}
      {logs.length > 0 && (
        <div className="log-output">
          <h3>Render Log</h3>
          <div className="log-container" ref={logContainerRef}>
            {logs.map((log, index) => (
              <div key={index} className="log-line">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Download button */}
      {downloadUrl && (
        <div className="download-section">
          <p className="success-message">✅ Render complete!</p>
          <a
            href={downloadUrl}
            download="output.mp4"
            className="btn btn-success btn-large"
          >
            Download Video
          </a>
        </div>
      )}
    </div>
  );
}

