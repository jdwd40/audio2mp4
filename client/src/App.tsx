import { useState, useRef } from 'react';
import TrackList from './components/TrackList';
import PresetSelect from './components/PresetSelect';
import RenderPanel from './components/RenderPanel';
import { PRESETS } from './types/index';
import type { Track, Preset } from './types/index';
import { submitRenderJob, connectToJobProgress, getDownloadUrl } from './api/render';
import './App.css';

function App() {
  const [tracks, setTracks] = useState<Track[]>([
    { id: crypto.randomUUID(), title: '', audioFile: null, imageFile: null },
    { id: crypto.randomUUID(), title: '', audioFile: null, imageFile: null },
  ]);

  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
  const [isRendering, setIsRendering] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ step: string; index?: number; total?: number } | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleAddTrack = () => {
    if (tracks.length < 10) {
      setTracks([
        ...tracks,
        { id: crypto.randomUUID(), title: '', audioFile: null, imageFile: null },
      ]);
    }
  };

  const handleUpdateTrack = (id: string, updates: Partial<Track>) => {
    setTracks(tracks.map((track) =>
      track.id === id ? { ...track, ...updates } : track
    ));
  };

  const handleRemoveTrack = (id: string) => {
    if (tracks.length > 2) {
      setTracks(tracks.filter((track) => track.id !== id));
    }
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newTracks = [...tracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    setTracks(newTracks);
  };

  const handleRender = async () => {
    // Reset state
    setLogs([]);
    setProgress(null);
    setDownloadUrl(null);
    setError(null);
    setIsRendering(true);
    
    // Close any existing SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    try {
      // Build metadata
      const meta = {
        tracks: tracks.map(t => ({ title: t.title || undefined })),
        width: selectedPreset.width,
        height: selectedPreset.height,
        fps: selectedPreset.fps,
      };
      
      // Collect files
      const audioFiles = tracks.map(t => t.audioFile!);
      const imageFiles = tracks.map(t => t.imageFile!);
      
      // Submit job
      const { jobId } = await submitRenderJob(meta, audioFiles, imageFiles);
      setLogs(prev => [...prev, `Job submitted: ${jobId}`]);
      
      // Connect to progress stream
      eventSourceRef.current = connectToJobProgress(jobId, {
        onLog: (message) => {
          setLogs(prev => [...prev, message]);
        },
        onProgress: (data) => {
          setProgress(data);
        },
        onDone: (url) => {
          setDownloadUrl(getDownloadUrl(jobId));
          setIsRendering(false);
          setProgress(null);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        },
        onError: (message) => {
          setError(message);
          setIsRendering(false);
          setProgress(null);
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        },
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsRendering(false);
      setLogs(prev => [...prev, `Error: ${errorMessage}`]);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 Audio2MP4</h1>
        <p>Convert multiple audio files with cover images into a single MP4 video</p>
      </header>

      <main className="app-main">
        <div className="config-section">
          <TrackList
            tracks={tracks}
            onUpdateTrack={handleUpdateTrack}
            onRemoveTrack={handleRemoveTrack}
            onAddTrack={handleAddTrack}
            onReorder={handleReorder}
          />

          <PresetSelect
            selectedPreset={selectedPreset}
            onSelectPreset={setSelectedPreset}
          />
        </div>

        <RenderPanel
          tracks={tracks}
          preset={selectedPreset}
          onRender={handleRender}
          isRendering={isRendering}
          logs={logs}
          progress={progress}
          downloadUrl={downloadUrl}
          error={error}
        />
      </main>
    </div>
  );
}

export default App;
