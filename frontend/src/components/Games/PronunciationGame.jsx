import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useTextContext } from '../../context/TextContext';
import './Games.css';
const apiURL = import.meta.env.VITE_BACKEND_URL;

const PronunciationGame = () => {
  const apiURL = import.meta.env.VITE_BACKEND_URL;
  const [textInput, setTextInput] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);

  const sendProgress = async (finalScore, totalCount = 1, passed) => {
    try {
      if (!user) return;
      const recordResp = await axios.post(
        `${apiURL}/api/v1/progress/record`,
        {
          gameType: 'pronunciation',
          score: finalScore,
          total: totalCount,
          passed,
          metadata: { text: textInput }
        },
        { headers: { Authorization: `Bearer ${user?.accessToken}` } }
      );
      const progressRecord = recordResp.data.progress;
      console.log('Pronunciation progress recorded', progressRecord);
      window.dispatchEvent(new CustomEvent('progressUpdated', { detail: { record: progressRecord } }));
    } catch (error) {
      console.error('Failed to record pronunciation progress', error);
    }
  };  const [voices, setVoices] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [recordedText, setRecordedText] = useState('');
  const [feedback, setFeedback] = useState('');
  const mediaRecorderRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const { user } = useAuthContext();
  const { sharedText, selectedVoice: sharedVoice } = useTextContext();

  React.useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(availableVoices[0]);
      }
    };

    const refresh = () => {
      loadVoices();
      if (window.speechSynthesis.getVoices().length === 0 && 'onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    };

    refresh();
  }, []);

  React.useEffect(() => {
    if (sharedText && !gameStarted) {
      setTextInput(sharedText);
      if (sharedVoice) {
        setSelectedVoice(sharedVoice);
      }
      toast.success('Text loaded from TTS! Click Start Game to begin.');
    }
  }, [sharedText, sharedVoice, gameStarted]);

  const handleStartGame = () => {
    if (!textInput.trim()) {
      toast.error('Please enter text to practice pronunciation');
      return;
    }
    setGameStarted(true);
    setRecordedText('');
    setFeedback('');
    playAudio();
  };

  const playAudio = () => {
    if ('speechSynthesis' in window && textInput.trim()) {
      const utterance = new SpeechSynthesisUtterance(textInput);
      const voiceToApply = selectedVoice || (voices.length > 0 ? voices[0] : null);
      if (voiceToApply) {
        utterance.voice = voiceToApply;
        utterance.lang = voiceToApply.lang;
      }
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);

      if (!voiceToApply) {
        toast.info('Using default browser voice - no custom voice loaded yet.');
      }
    } else {
      toast.error('Speech synthesis not available in this browser.');
    }
  };

  const pauseAudio = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      toast.info('Audio paused - practice your pronunciation!');
    }
  };

  const resumeAudio = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      toast.success('Audio resumed');
    }
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    toast.info('Audio stopped');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await sendAudioToBackend(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      mediaRecorder.start();

      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          toast.success('Recording time limit reached. Processing...');
        }
      }, 15000); // 15 second recording limit
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      toast.success('Recording stopped. Processing...');
    }
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    try {
      const buffer = await audioBlob.arrayBuffer();
      const file = new File([buffer], "audio.webm", {
        type: audioBlob.type,
        lastModified: Date.now(),
      });

      const formData = new FormData();
      formData.append('file', file);
      if (selectedVoice && selectedVoice.lang) {
        formData.append('language', selectedVoice.lang.split('-')[0]);
      }

      const config = {
        headers: {
          Authorization: `Bearer ${user?.accessToken}`,
          'Content-Type': 'multipart/form-data'
        },
      };

      const response = await axios.post(
        `${apiURL}/api/v1/speechtotext/`,
        formData,
        config
      );

      if (response.data && response.data.transcript) {
        setRecordedText(response.data.transcript);
        comparePronounciation(response.data.transcript);
      } else {
        toast.error('Could not recognize speech');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error?.response?.data?.message || 'Error processing audio');
    }
  };

  const comparePronounciation = (recognizedText) => {
    const original = textInput.trim().toLowerCase();
    const recorded = recognizedText.trim().toLowerCase();

    const similarity = calculateSimilarity(original, recorded);

    if (similarity >= 0.8) {
      setFeedback('🎉 Excellent Pronunciation!');
      setScore(score + 1);
    } else if (similarity >= 0.6) {
      setFeedback('👍 Good! Could be better.');
    } else if (similarity >= 0.4) {
      setFeedback('⚠️ Close, but try again.');
    } else {
      setFeedback('❌ Not quite right. Listen and try again.');
    }
  };

  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (s1, s2) => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  const resetGame = async () => {
    const passed = score >= 1;
    await sendProgress(score, 1, passed);
    setScore(0);
    setGameStarted(false);
    setRecordedText('');
    setTextInput('');
    setFeedback('');
    window.speechSynthesis.cancel();
  };

  const playAgain = () => {
    playAudio();
  };

  return (
    <div className="game__container">
      <div className="game__card">
        <h1>🎤 Pronunciation Practice Game</h1>
        
        {!gameStarted ? (
          <div className="game__setup">
            <h2>Enter Text to Practice Pronunciation</h2>
            <textarea
              placeholder="Enter a word, sentence, or phrase to practice..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              maxLength="100"
            />
            <select
              value={selectedVoice ? selectedVoice.name : ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                setSelectedVoice(voice);
              }}
            >
              {voices.map((voice, index) => (
                <option key={index} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
            <button className="game__btn start__btn" onClick={handleStartGame}>
              Start Game
            </button>
            <div className="game__score">Score: {score}</div>
          </div>
        ) : (
          <div className="game__playing">
            <h2>Listen and Repeat</h2>
            <div className="game__instruction">
              Listen to the pronunciation, then record yourself saying the same word/phrase.
            </div>
            
            <button 
              className="game__btn play__btn" 
              onClick={playAgain}
              disabled={isPlaying}
            >
              {isPlaying ? (isPaused ? '🔊 Paused' : '🔊 Playing...') : '🔊 Play Audio'}
            </button>

            {isPlaying && (
              <div className="audio__controls">
                <button 
                  className="game__btn control__btn" 
                  onClick={pauseAudio}
                  disabled={isPaused}
                >
                  ⏸️ Pause
                </button>
                <button 
                  className="game__btn control__btn" 
                  onClick={resumeAudio}
                  disabled={!isPaused}
                >
                  ▶️ Resume
                </button>
                <button 
                  className="game__btn control__btn" 
                  onClick={stopAudio}
                >
                  ⏹️ Stop
                </button>
              </div>
            )}

            <button 
              className={`game__btn record__btn ${isRecording ? 'recording' : ''}`}
              onClick={handleRecordingToggle}
            >
              {isRecording ? '⏹️ Stop & Submit' : '🎙️ Start Recording'}
            </button>

            {recordedText && (
              <div className="game__result">
                <p><strong>You said:</strong> "{recordedText}"</p>
                <p><strong>Target:</strong> "{textInput}"</p>
                {feedback && <p className="feedback">{feedback}</p>}
              </div>
            )}

            <button 
              className="game__btn check__btn" 
              onClick={playAgain}
              disabled={isPlaying}
            >
              Try Again
            </button>

            <button 
              className="game__btn reset__btn" 
              onClick={resetGame}
            >
              Quit Game
            </button>

            <div className="game__score">Score: {score}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PronunciationGame;
