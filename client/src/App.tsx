import { useState } from 'react';
import TrackList from './components/TrackList';
import PresetSelect from './components/PresetSelect';
import RenderPanel from './components/RenderPanel';
import { Track, Preset, PRESETS } from './types/index';
import './App.css';

function App() {
  const [tracks, setTracks] = useState<Track[]>([
    { id: crypto.randomUUID(), title: '', audioFile: null, imageFile: null },
    { id: crypto.randomUUID(), title: '', audioFile: null, imageFile: null },
  ]);

  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
  const [isRendering, setIsRendering] = useState(false);

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

  const handleRender = () => {
    // Placeholder for now - will wire to backend in T7
    console.log('Rendering with:', { tracks, preset: selectedPreset });
    setIsRendering(true);
    setTimeout(() => {
      setIsRendering(false);
      alert('Render complete! (Demo mode - backend not connected yet)');
    }, 2000);
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
        />
      </main>
    </div>
  );
}

export default App;
