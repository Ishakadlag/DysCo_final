import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTextContext } from '../../context/TextContext';
import { useDyslexiaMode } from '../../hooks/useDyslexiaMode';
import InteractiveWord from './InteractiveWord';
import './TextToSpeech.css';

const TextToSpeech = () => {
  const { isDyslexiaMode } = useDyslexiaMode();
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [isReadingMode, setIsReadingMode] = useState(false);
  
  const [showVisuals, setShowVisuals] = useState(() => {
    const saved = localStorage.getItem('showVisuals');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  const handleToggleVisuals = () => {
    const newVal = !showVisuals;
    setShowVisuals(newVal);
    localStorage.setItem('showVisuals', JSON.stringify(newVal));
  };
  
  // Highlighting states
  const [wordsWithIndices, setWordsWithIndices] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const fallbackIntervalRef = React.useRef(null);
  const boundaryFiredRef = React.useRef(false);
  const wordIndexRef = React.useRef(0);
  
  const { updateSharedText, updateSelectedVoice } = useTextContext();

  // Load voices securely
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(availableVoices[0]);
      }
    };

    const refresh = () => {
      loadVoices();
      if (!window.speechSynthesis.getVoices().length && 'onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    };

    refresh();
  }, []);

  // Split text into trackable word chunks
  useEffect(() => {
    const list = [];
    // Matches any non-whitespace sequence as a word
    const regex = /\S+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      list.push({
        word: match[0],
        startIndex: match.index,
        // Using length doesn't account for trailing punctuations effectively on all TTS engines,
        // but works flawlessly for basic charIndex mapping on onboundary fires.
        endIndex: match.index + match[0].length,
      });
    }
    setWordsWithIndices(list);
  }, [text]);

  const handleConvertTextToSpeech = () => {
    if (!text.trim()) {
      toast.error('Please enter some text to convert.');
      return;
    }
    
    setIsReadingMode(true);

    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-Speech is not supported in this browser.');
      return;
    }

    const installedVoices = window.speechSynthesis.getVoices();
    if (!installedVoices.length) {
      toast.error('Voice list not loaded yet. Please wait a moment and try again.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voiceToUse = selectedVoice || installedVoices[0];

    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }

    utterance.rate = speechRate;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setHighlightedIndex(0);
      wordIndexRef.current = 0;
      boundaryFiredRef.current = false;

      // Immediately set the fallback interval, but it will only process if onboundary never fires
      fallbackIntervalRef.current = setInterval(() => {
        if (!boundaryFiredRef.current && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          setHighlightedIndex((prev) => {
            const words = text.trim().split(/\s+/);
            const nextIndex = prev + 1;
            if (nextIndex >= words.length) {
              clearInterval(fallbackIntervalRef.current);
              return prev;
            }
            return nextIndex;
          });
        }
      }, 350); // 350ms average word rate
    };

    utterance.onboundary = (event) => {
      // The moment a boundary event fires, we permanently clear the fallback interval
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      boundaryFiredRef.current = true;

      if (event.name === 'word') {
        const charIndex = event.charIndex;
        // Find which word spans this charIndex
        let index = wordsWithIndices.findIndex(
          (w) => charIndex >= w.startIndex && charIndex <= w.endIndex
        );

        // If charIndex points to whitespace/punctuation between words, find the immediate next word
        if (index === -1) {
          index = wordsWithIndices.findIndex((w) => w.startIndex >= charIndex);
        }

        if (index !== -1) {
          setHighlightedIndex(index);
          wordIndexRef.current = index;
        }
      }
    };

    const cleanupStates = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setHighlightedIndex(-1);
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };

    utterance.onend = () => {
      cleanupStates();
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('Speech synthesis error:', e);
      }
      cleanupStates();
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    toast.success('Speaking...');
  }; 

  const handlePause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      toast.success('Audio paused');
    }
  };

  const handleResume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      toast.success('Audio resumed');
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setHighlightedIndex(-1); 
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }
    toast.success('Audio stopped');
  };

  const shareTextForGames = () => {
    if (!text.trim()) {
      toast.error('Please enter text first');
      return;
    }
    updateSharedText(text);
    updateSelectedVoice(selectedVoice);
    toast.success('Text shared with games! Switch to a game tab to start playing.');
  };

  return (
    <div className='tts__page__container'>
      <h1>Text to Speech</h1>
      
      {/* Display readable text once converted. Switch back via Edit Text. */}
      {isReadingMode ? (
        <div className='tts__reading__container'>
          {wordsWithIndices.map((wordObj, i) => (
            <InteractiveWord
              key={i}
              wordObj={wordObj}
              fullText={text}
              isDyslexiaMode={isDyslexiaMode}
              isHighlighted={highlightedIndex === i}
              selectedVoice={selectedVoice}
              speechRate={speechRate}
              showVisuals={showVisuals}
            />
          ))}
        </div>
      ) : (
        <textarea
          placeholder="Enter text to convert to speech"
          value={text}
          onChange={(e) => {setText(e.target.value)}}
        />
      )}
      
      <select
        value={selectedVoice ? selectedVoice.name : ''}
        onChange={(e) => {
          const voice = voices.find(v => v.name === e.target.value);
          setSelectedVoice(voice);
        }}
        disabled={!voices.length}
        style={{ margin: '15px 0', padding: '8px', borderRadius: '5px' }}
      >
        {voices.map((voice, index) => (
          <option key={index} value={voice.name}>
            {voice.name} ({voice.lang})
          </option>
        ))}
      </select>

      <div style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <label style={{ marginBottom: '5px', fontWeight: 'bold' }}>
          Speed: {speechRate.toFixed(1)}x
        </label>
        <input 
          type="range" 
          className="tts-slider"
          min="0.5" 
          max="1.5" 
          step="0.1" 
          value={speechRate}
          onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
        />
      </div>

      <div style={{ margin: '10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input 
          type="checkbox" 
          id="visualsToggle"
          checked={showVisuals}
          onChange={handleToggleVisuals}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="visualsToggle" style={{ fontWeight: '500', cursor: 'pointer' }}>
          Show Visuals
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {isReadingMode && (
          <button className="secondary__btn" onClick={() => { setIsReadingMode(false); handleStop(); }}>
            Edit Text
          </button>
        )}
        <button className="primary__btn" onClick={handleConvertTextToSpeech} disabled={isSpeaking && !isPaused}>
          Convert to Speech
        </button>
        <button className="primary__btn share__btn" onClick={shareTextForGames}>
          Share Text for Games
        </button>
      </div>

      <div style={{marginTop: '15px', display: 'flex', gap: '10px'}}>
        <button className="primary__btn" onClick={handlePause} disabled={isPaused || !isSpeaking}>Pause</button>
        <button className="primary__btn" onClick={handleResume} disabled={!isPaused}>Resume</button>
        <button className="primary__btn" onClick={handleStop} disabled={!isSpeaking && !isPaused}>Stop</button>
      </div>
    </div>
  );
};

export default TextToSpeech;
