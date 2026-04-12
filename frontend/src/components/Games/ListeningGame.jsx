import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTextContext } from '../../context/TextContext';
import { useAuthContext } from '../../hooks/useAuthContext';
import './Games.css';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const ListeningGame = () => {
  const [textInput, setTextInput] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const { sharedText, selectedVoice: sharedVoice } = useTextContext();
  const { user } = useAuthContext();

  const sendProgress = async (scoreValue, totalValue, passedValue) => {
    try {
      if (!user) return;
      const recordResp = await axios.post(
        `${apiURL}/api/v1/progress/record`,
        {
          gameType: 'listening',
          score: scoreValue,
          total: totalValue,
          passed: passedValue,
          metadata: { attempts: attempts }
        },
        {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const progressRecord = recordResp.data.progress;
      console.log('Listening progress recorded', progressRecord);
      window.dispatchEvent(new CustomEvent('progressUpdated', { detail: { record: progressRecord } }));
    } catch (error) {
      console.error('Could not send listening game progress', error);
    }
  };

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
      if (window.speechSynthesis.getVoices().length === 0 && 'onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    };

    refresh();
  }, []);

  useEffect(() => {
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
      toast.error('Please enter text to practice');
      return;
    }
    setGameStarted(true);
    setUserAnswer('');
    setAttempts(0);
    playAudio();
  };

  const playAudio = () => {
    if ('speechSynthesis' in window && textInput.trim()) {
      const utterance = new SpeechSynthesisUtterance(textInput);
      const voiceToApply = selectedVoice || (voices.length > 0 ? voices[0] : null);
      if (voiceToApply) {
        utterance.voice = voiceToApply;
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
      toast.info('Audio paused - take your time!');
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

  const handleCheckAnswer = () => {
    const correctText = textInput.trim().toLowerCase();
    const userText = userAnswer.trim().toLowerCase();

    if (userText === correctText) {
      toast.success('🎉 Correct! Perfect spelling!');
      setScore(score + 1);
      sendProgress(score + 1, 1, true);
      setGameStarted(false);
      setUserAnswer('');
      setTextInput('');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        toast.error(`❌ Game Over! The correct answer was: "${textInput}"`);
        sendProgress(score, 1, false);
        setGameStarted(false);
        setUserAnswer('');
      } else {
        toast.error(`❌ Wrong! ${3 - newAttempts} attempts left. Try again!`);
      }
    }
  };

  const handlePlayAgain = () => {
    playAudio();
  };

  const resetGame = () => {
    setScore(0);
    setAttempts(0);
    setGameStarted(false);
    setUserAnswer('');
    setTextInput('');
    window.speechSynthesis.cancel();
  };

  return (
    <div className="game__container">
      <div className="game__card">
        <h1>🎧 Listening & Spelling Game</h1>

        {!gameStarted ? (
          <div className="game__setup">
            <h2>Enter Text to Practice</h2>
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
            <h2>Listen and Type What You Hear</h2>
            <div className="game__instruction">
              Click the Play button and listen carefully, then type what you heard.
            </div>

            <button
              className="game__btn play__btn"
              onClick={handlePlayAgain}
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

            <div className="game__answer">
              <label>Your Answer:</label>
              <input
                type="text"
                placeholder="Type what you heard..."
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCheckAnswer()}
              />
            </div>

            <div className="game__attempts">Attempts: {attempts}/3</div>

            <button
              className="game__btn check__btn"
              onClick={handleCheckAnswer}
              disabled={!userAnswer.trim()}
            >
              Check Answer ✓
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

export default ListeningGame;
