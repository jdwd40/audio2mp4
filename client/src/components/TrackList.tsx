import type { Track } from '../types/index';

interface TrackListProps {
  tracks: Track[];
  onUpdateTrack: (id: string, updates: Partial<Track>) => void;
  onRemoveTrack: (id: string) => void;
  onAddTrack: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function TrackList({
  tracks,
  onUpdateTrack,
  onRemoveTrack,
  onAddTrack,
  onReorder,
}: TrackListProps) {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      onReorder(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < tracks.length - 1) {
      onReorder(index, index + 1);
    }
  };

  return (
    <div className="track-list">
      <div className="track-list-header">
        <h2>Tracks ({tracks.length})</h2>
        <button
          onClick={onAddTrack}
          disabled={tracks.length >= 10}
          className="btn btn-primary"
        >
          + Add Track
        </button>
      </div>

      <div className="tracks">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="track-row"
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <div className="track-drag-handle">⋮⋮</div>

            <div className="track-number">{index + 1}</div>

            <div className="track-fields">
              <input
                type="text"
                placeholder="Track title (optional)"
                value={track.title || ''}
                onChange={(e) =>
                  onUpdateTrack(track.id, { title: e.target.value })
                }
                className="track-title-input"
              />

              <div className="track-files">
                <label className="file-input-label">
                  <input
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/x-m4a,audio/aac,audio/flac,audio/ogg"
                    onChange={(e) =>
                      onUpdateTrack(track.id, {
                        audioFile: e.target.files?.[0] || null,
                      })
                    }
                  />
                  <span className={track.audioFile ? 'has-file' : ''}>
                    {track.audioFile
                      ? `🎵 ${track.audioFile.name}`
                      : '🎵 Select audio...'}
                  </span>
                </label>

                <label className="file-input-label">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      onUpdateTrack(track.id, {
                        imageFile: e.target.files?.[0] || null,
                      })
                    }
                  />
                  <span className={track.imageFile ? 'has-file' : ''}>
                    {track.imageFile
                      ? `🖼️ ${track.imageFile.name}`
                      : '🖼️ Select image...'}
                  </span>
                </label>
              </div>
            </div>

            <div className="track-controls">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="btn btn-icon"
                title="Move up"
                aria-label="Move track up"
              >
                ↑
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === tracks.length - 1}
                className="btn btn-icon"
                title="Move down"
                aria-label="Move track down"
              >
                ↓
              </button>
              <button
                onClick={() => onRemoveTrack(track.id)}
                disabled={tracks.length <= 2}
                className="btn btn-icon btn-danger"
                title="Remove track"
                aria-label="Remove track"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {tracks.length < 2 && (
        <p className="validation-hint">Add at least 2 tracks to render.</p>
      )}
      {tracks.length >= 10 && (
        <p className="validation-hint">Maximum 10 tracks allowed.</p>
      )}
    </div>
  );
}

