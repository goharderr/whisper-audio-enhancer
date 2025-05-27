import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  // Default settings
  const [audioFile, setAudioFile] = useState(null);
  const [volume, setVolume] = useState(0.57);  // 57%
  const [preset, setPreset] = useState('clarity');  // Audio Clarity
  const [amplifyQuiet, setAmplifyQuiet] = useState(8);  // 8/10
  
  // New features
  const [detectedSounds, setDetectedSounds] = useState([]);
  const [disabledSounds, setDisabledSounds] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptProgress, setTranscriptProgress] = useState(0);
  const [backgroundProcessing, setBackgroundProcessing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const eqLowRef = useRef(null);
  const eqMidRef = useRef(null);
  const eqHighRef = useRef(null);
  const compressorRef = useRef(null);
  const analyzerRef = useRef(null);
  const audioSetupDoneRef = useRef(false);
  const filtersRef = useRef({});
  const recognitionRef = useRef(null);
  
  // Sound classes that we can detect and remove
  const soundCategories = [
    {id: 'dog_bark', name: 'Dog Barking', frequency: '400-1200Hz'},
    {id: 'tv_noise', name: 'Television', frequency: '100-8000Hz'},
    {id: 'toilet', name: 'Toilet/Water Sounds', frequency: '300-900Hz'},
    {id: 'background_chatter', name: 'Background Conversations', frequency: '200-3000Hz'},
    {id: 'fan_noise', name: 'Fan/Air Conditioning', frequency: '50-300Hz'},
    {id: 'keyboard_typing', name: 'Keyboard Typing', frequency: '1000-5000Hz'},
    {id: 'traffic', name: 'Traffic/Vehicle Sounds', frequency: '80-1000Hz'},
    {id: 'door_sounds', name: 'Door Slamming', frequency: '50-500Hz'}
  ];
  
  // Preset definitions
  const presets = {
    none: {
      name: 'No Enhancement',
      description: 'Original audio without enhancements',
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      compression: 0
    },
    speech: {
      name: 'Speech Enhancement',
      description: 'Clearer voices with reduced background noise',
      eqLow: -3,
      eqMid: 4,
      eqHigh: 2,
      compression: 6
    },
    clarity: {
      name: 'Audio Clarity',
      description: 'Enhanced overall clarity for all audio types',
      eqLow: -2,
      eqMid: 3,
      eqHigh: 3,
      compression: 4
    },
    podcast: {
      name: 'Podcast Mode',
      description: 'Optimized for spoken word recordings',
      eqLow: -4,
      eqMid: 5,
      eqHigh: 1,
      compression: 7
    },
    music: {
      name: 'Music Balance',
      description: 'Balanced enhancement for music',
      eqLow: 2,
      eqMid: 0,
      eqHigh: 2,
      compression: 3
    }
  };
  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (2 hours of audio at typical bitrate)
      const twoHoursInBytes = 2 * 60 * 60 * 192000 / 8; // ~172MB for 2 hours
      if (file.size > twoHoursInBytes) {
        alert("Warning: Files over 2 hours may cause performance issues. Processing will continue but might be slow.");
      }
      
      setAudioFile(file);
      console.log("File selected:", file.name);
      
      // Reset processing states
      setIsProcessing(true);
      setProcessingProgress(0);
      setTranscript('');
      setTranscriptProgress(0);
      setDetectedSounds([]);
      setDisabledSounds([]);
      
      // Reset the audio setup flag when file changes
      audioSetupDoneRef.current = false;
      
      // Simulate sound detection
      simulateSoundDetection(file);
    }
  };

  const simulateSoundDetection = (file) => {
    // In a real app, this would be replaced by actual audio analysis
    // Here we'll simulate detection with progress updates
    
    // Reset progress
    setProcessingProgress(0);
    
    // Get a subset of sound categories to "detect" in this file
    const numSounds = Math.floor(Math.random() * 4) + 1; // Detect 1-4 sounds
    const shuffled = [...soundCategories].sort(() => 0.5 - Math.random());
    const soundsToDetect = shuffled.slice(0, numSounds);
    
    // Simulate processing progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      setProcessingProgress(Math.min(progress, 100));
      
      if (progress >= 100) {
        clearInterval(progressInterval);
        setDetectedSounds(soundsToDetect);
        setIsProcessing(false);
      }
    }, 200);
  };

  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };
  
  const handlePresetChange = (presetKey) => {
    setPreset(presetKey);
    applyPreset(presetKey);
  };
  
  const handleAmplifyQuietChange = (event) => {
    const newValue = parseInt(event.target.value);
    setAmplifyQuiet(newValue);
    
    if (compressorRef.current) {
      // Configure compressor to amplify quiet sounds
      // Higher values = more amplification of quiet sounds
      compressorRef.current.threshold.value = -50 - (newValue * 2);
      compressorRef.current.ratio.value = 1 - (newValue * 0.05); // Values below 1 amplify rather than compress
      compressorRef.current.knee.value = 15;
      compressorRef.current.attack.value = 0.02;
      compressorRef.current.release.value = 0.3;
    }
  };
  
  const toggleSoundRemoval = (soundId) => {
    if (disabledSounds.includes(soundId)) {
      setDisabledSounds(disabledSounds.filter(id => id !== soundId));
      enableSound(soundId);
    } else {
      setDisabledSounds([...disabledSounds, soundId]);
      disableSound(soundId);
    }
  };
  
  const disableSound = (soundId) => {
    // In a real implementation, this would configure specific audio filters
    // to target the frequency range of this particular sound
    
    const sound = soundCategories.find(s => s.id === soundId);
    if (!sound || !audioContextRef.current) return;
    
    // Create a notch filter if it doesn't exist
    if (!filtersRef.current[soundId]) {
      const filter = audioContextRef.current.createBiquadFilter();
      filter.type = 'notch';
      
      // Approximate frequency from the range
      const range = sound.frequency.match(/(\d+)-(\d+)Hz/);
      if (range) {
        const lowFreq = parseInt(range[1]);
        const highFreq = parseInt(range[2]);
        const centerFreq = Math.sqrt(lowFreq * highFreq);
        const bandwidth = highFreq - lowFreq;
        
        filter.frequency.value = centerFreq;
        filter.Q.value = centerFreq / bandwidth;
      }
      
      // Insert the filter into the processing chain
      if (eqHighRef.current) {
        const destination = eqHighRef.current.destination;
        eqHighRef.current.disconnect();
        eqHighRef.current.connect(filter);
        filter.connect(destination);
      }
      
      filtersRef.current[soundId] = filter;
    }
  };
  
  const enableSound = (soundId) => {
    // This would remove the specific filter for this sound type
    // For now, just log that we would re-enable it
    console.log(`Re-enabling sound: ${soundId}`);
  };
  
  // Apply preset settings
  const applyPreset = (presetKey) => {
    if (!eqLowRef.current || !eqMidRef.current || !eqHighRef.current || !compressorRef.current) {
      return;
    }
    
    const settings = presets[presetKey];
    
    // Apply EQ settings
    eqLowRef.current.gain.value = settings.eqLow;
    eqMidRef.current.gain.value = settings.eqMid;
    eqHighRef.current.gain.value = settings.eqHigh;
    
    // Apply compression settings
    const compression = settings.compression;
    compressorRef.current.threshold.value = -30 - (compression * 2);
    compressorRef.current.ratio.value = 1 + (compression * 0.5);
    compressorRef.current.knee.value = 10 - compression * 0.5;
    compressorRef.current.attack.value = 0.003;
    compressorRef.current.release.value = 0.25;
    
    console.log(`Applied preset: ${settings.name}`);
  };
  
  const startTranscription = () => {
    if (!audioFile || isTranscribing) return;
    
    setIsTranscribing(true);
    setTranscript("Transcription in progress...");
    setTranscriptProgress(0);
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // This is a simplified approach. In reality, we'd need a more sophisticated
      // way to feed audio file data to the speech recognition API
      
      // Simulate transcription with progress
      let progress = 0;
      const transcriptInterval = setInterval(() => {
        progress += 2;
        setTranscriptProgress(Math.min(progress, 100));
        
        if (progress >= 100) {
          clearInterval(transcriptInterval);
          setIsTranscribing(false);
          setTranscript("This is a simulated transcript of your audio.\n\n" + 
                        "In a real application, this would contain the actual transcribed text from your audio file. " +
                        "The transcription would be generated using speech recognition technology and would be processed in the background " +
                        "while you continue to use other features of the app.\n\n" +
                        "For a real implementation, you would need a server-side component with a speech-to-text API " +
                        "such as Google's Speech-to-Text, Microsoft's Cognitive Services, or similar technologies.");
        }
      }, 200);
    } else {
      setTranscript("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      setIsTranscribing(false);
    }
  };
  
  // Set up audio processing
  useEffect(() => {
    if (!audioFile || !audioRef.current) return;
    
    // Create audio context if we don't have one
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
    
    const setupAudio = () => {
      // Only run setup once per audio file
      if (audioSetupDoneRef.current) return;
      
      try {
        const audioContext = audioContextRef.current;
        
        // Create new audio source from the audio element
        const source = audioContext.createMediaElementSource(audioRef.current);
        sourceNodeRef.current = source;
        
        // Create analyzer for audio visualization
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 2048;
        analyzerRef.current = analyzer;
        
        // Create compressor for both general compression and quiet sound amplification
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -50 - (amplifyQuiet * 2); // Apply default amplify setting
        compressor.ratio.value = 1 - (amplifyQuiet * 0.05);    // Apply default amplify setting
        compressor.knee.value = 15;
        compressor.attack.value = 0.02;
        compressor.release.value = 0.3;
        compressorRef.current = compressor;
        
        // Create EQ filters
        // Low EQ (low shelf)
        const eqLow = audioContext.createBiquadFilter();
        eqLow.type = 'lowshelf';
        eqLow.frequency.value = 250;  // Affects frequencies below 250 Hz
        eqLow.gain.value = 0;         // Start with no change
        eqLowRef.current = eqLow;
        
        // Mid EQ (peaking)
        const eqMid = audioContext.createBiquadFilter();
        eqMid.type = 'peaking';
        eqMid.frequency.value = 1500;  // 1.5kHz
        eqMid.Q.value = 1;             // Medium-narrow width
        eqMid.gain.value = 0;          // Start with no change
        eqMidRef.current = eqMid;
        
        // High EQ (high shelf)
        const eqHigh = audioContext.createBiquadFilter();
        eqHigh.type = 'highshelf';
        eqHigh.frequency.value = 3500; // Affects frequencies above 3.5kHz
        eqHigh.gain.value = 0;         // Start with no change
        eqHighRef.current = eqHigh;
        
        // Connect everything:
        // source -> analyzer -> compressor -> eqLow -> eqMid -> eqHigh -> destination
        source.connect(analyzer);
        analyzer.connect(compressor);
        compressor.connect(eqLow);
        eqLow.connect(eqMid);
        eqMid.connect(eqHigh);
        eqHigh.connect(audioContext.destination);
        
        // Mark setup as done for this audio file
        audioSetupDoneRef.current = true;
        
        console.log("Audio processing chain established");
        
        // Apply default preset
        applyPreset(preset);
      } catch (e) {
        console.error("Error setting up audio processing:", e);
      }
    };
    
    // Setup audio processing when the audio element is ready
    const canPlayHandler = () => {
      if (!audioSetupDoneRef.current) {
        setupAudio();
      }
    };
    
    if (audioRef.current.readyState >= 2) {
      setupAudio();
    } else {
      audioRef.current.addEventListener('canplay', canPlayHandler);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('canplay', canPlayHandler);
      }
    };
  }, [audioFile, amplifyQuiet, preset]);

  return (
    <div className="App">
      <header>
        <h1>Audio Enhancer</h1>
      </header>
      <main>
        {!audioFile ? (
          <div className="upload-area">
            <h2>Upload an audio file</h2>
            <p>Support for files up to 2 hours in length</p>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileChange} 
            />
          </div>
        ) : (
          <div className="player-area">
            <h3>Playing: {audioFile.name}</h3>
            <audio 
              controls 
              src={URL.createObjectURL(audioFile)}
              ref={audioRef}
            />
            
            {isProcessing ? (
              <div className="processing-indicator">
                <h4>Analyzing audio...</h4>
                <div className="progress-bar">
                  <div 
                    className="progress" 
                    style={{width: `${processingProgress}%`}}
                  ></div>
                </div>
                <div className="progress-text">{processingProgress}%</div>
              </div>
            ) : (
              <div className="controls-container">
                <div className="controls">
                  <div className="control-group">
                    <h4>Volume</h4>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                    />
                    <span>{Math.round(volume * 100)}%</span>
                  </div>
                  
                  <div className="control-group">
                    <h4>Amplify Quiet Sounds</h4>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={amplifyQuiet}
                      onChange={handleAmplifyQuietChange}
                    />
                    <span>{amplifyQuiet}/10</span>
                  </div>
                  
                  <div className="preset-section">
                    <h4>Enhancement Presets</h4>
                    <div className="preset-buttons">
                      {Object.keys(presets).map(presetKey => (
                        <div 
                          key={presetKey}
                          className={`preset-button ${preset === presetKey ? 'active' : ''}`}
                          onClick={() => handlePresetChange(presetKey)}
                        >
                          <div className="preset-name">{presets[presetKey].name}</div>
                          <div className="preset-description">{presets[presetKey].description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {detectedSounds.length > 0 && (
                    <div className="sound-removal-section">
                      <h4>Detected Sounds</h4>
                      <p className="section-description">Click on sounds to toggle removal</p>
                      <div className="detected-sounds-list">
                        {detectedSounds.map(sound => (
                          <div 
                            key={sound.id}
                            className={`sound-item ${disabledSounds.includes(sound.id) ? 'removed' : ''}`}
                            onClick={() => toggleSoundRemoval(sound.id)}
                          >
                            <div className="sound-name">{sound.name}</div>
                            <div className="sound-frequency">{sound.frequency}</div>
                            <div className="sound-status">
                              {disabledSounds.includes(sound.id) ? 'Removed' : 'Active'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="transcription-section">
                    <h4>Transcription</h4>
                    
                    <div className="transcription-options">
                      <label>
                        <input
                          type="checkbox"
                          checked={backgroundProcessing}
                          onChange={() => setBackgroundProcessing(!backgroundProcessing)}
                        />
                        Process in background
                      </label>
                      
                      <button 
                        className="transcribe-button"
                        onClick={startTranscription}
                        disabled={isTranscribing}
                      >
                        {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
                      </button>
                    </div>
                    
                    {isTranscribing && (
                      <div className="progress-bar">
                        <div 
                          className="progress" 
                          style={{width: `${transcriptProgress}%`}}
                        ></div>
                      </div>
                    )}
                    
                    {transcript && (
                      <div className="transcript-container">
                        <h5>Transcript</h5>
                        <div className="transcript-text">
                          {transcript.split('\n\n').map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;