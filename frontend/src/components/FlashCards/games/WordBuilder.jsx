import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthContext } from '../../../hooks/useAuthContext';
import './Games.css';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const WordBuilder = ({ cards, onBack }) => {
  const { user } = useAuthContext();
  const [currentCard, setCurrentCard] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [gameCards, setGameCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const recordProgress = async (scoreValue, totalValue, passed, gameType = 'flashcards') => {
    if (!user) return;
    try {
      const response = await axios.post(
        `${apiURL}/api/v1/progress/record`,
        { gameType, score: scoreValue, total: totalValue, passed },
        { headers: { Authorization: `Bearer ${user?.accessToken}` } }
      );
      const progressRecord = response.data.progress;
      window.dispatchEvent(new CustomEvent('progressUpdated', { detail: { record: progressRecord } }));
    } catch (error) {
      console.error('WordBuilder progress record error', error);
    }
  };

  useEffect(() => {
    if (gameCompleted && !hasRecorded && gameCards.length > 0) {
      const passed = score / gameCards.length >= 0.6;
      recordProgress(score, gameCards.length, passed, 'flashcards');
      setHasRecorded(true);
    }
  }, [gameCompleted, hasRecorded, score, gameCards.length]);


  useEffect(() => {
    if (cards.length > 0) {
      initializeGame();
    }
  }, [cards]);

  const initializeGame = () => {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    const gameSet = shuffledCards.slice(0, Math.min(10, shuffledCards.length));
    setGameCards(gameSet);
    setCurrentIndex(0);
    setCurrentCard(gameSet[0]);
    setScore(0);
    setAttempts(0);
    setUserInput('');
    setShowResult(false);
    setIsCorrect(false);
    setGameCompleted(false);
  };

  const checkAnswer = () => {
    if (!userInput.trim()) return;

    const correct = userInput.toLowerCase().trim() === currentCard.name.toLowerCase().trim();
    setIsCorrect(correct);
    setShowResult(true);
    setAttempts(prev => prev + 1);

    if (correct) {
      setScore(prev => prev + 1);
    }
  };

  const nextCard = () => {
    if (currentIndex < gameCards.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentCard(gameCards[nextIndex]);
      setUserInput('');
      setShowResult(false);
      setIsCorrect(false);
    } else {
      setGameCompleted(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !showResult) {
      checkAnswer();
    }
  };

  const resetGame = () => {
    initializeGame();
    setHasRecorded(false);
  };

  if (cards.length === 0) {
    return (
      <div className='game__container'>
        <h2>⌨️ Word Builder</h2>
        <p>You need flashcards to play this game!</p>
        <button onClick={onBack} className='secondary__btn'>Back to Games</button>
      </div>
    );
  }

  if (gameCompleted) {
    const percentage = Math.round((score / gameCards.length) * 100);
    return (
      <div className='game__container'>
        <h2>⌨️ Word Builder - Results</h2>
        <div className='game__results'>
          <h3>Game Completed!</h3>
          <p>Score: {score}/{gameCards.length} ({percentage}%)</p>
          <p>Total Attempts: {attempts}</p>
          <div className='result__message'>
            {percentage >= 80 ? '🎉 Excellent typing!' :
             percentage >= 60 ? '👍 Good job!' :
             percentage >= 40 ? '🤔 Keep practicing!' :
             '📚 Need more practice!'}
          </div>
          <div className='game__controls'>
            <button onClick={resetGame} className='primary__btn'>Play Again</button>
            <button onClick={onBack} className='secondary__btn'>Back to Games</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='game__container'>
      <div className='game__header'>
        <h2>⌨️ Word Builder</h2>
        <div className='game__stats'>
          <span>Card: {currentIndex + 1}/{gameCards.length}</span>
          <span>Score: {score}</span>
        </div>
      </div>

      {currentCard && (
        <div className='wordbuilder__container'>
          <div className='wordbuilder__card'>
            <img src={currentCard.imageUrl} alt={currentCard.name} />
          </div>

          <div className='input__section'>
            <h3>Type the name of this object:</h3>
            <input
              type='text'
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Enter the word...'
              className='word__input'
              disabled={showResult}
              autoFocus
            />

            {!showResult ? (
              <button onClick={checkAnswer} className='primary__btn' disabled={!userInput.trim()}>
                Check Answer
              </button>
            ) : (
              <div className='result__feedback'>
                {isCorrect ? (
                  <div>
                    <p className='correct__feedback'>✅ Correct! "{currentCard.name}"</p>
                    <button onClick={nextCard} className='primary__btn'>
                      {currentIndex < gameCards.length - 1 ? 'Next Card' : 'Finish Game'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className='incorrect__feedback'>
                      ❌ Not quite! The correct answer is: <strong>{currentCard.name}</strong>
                    </p>
                    <p>Your answer: <strong>{userInput}</strong></p>
                    <button onClick={nextCard} className='secondary__btn'>
                      {currentIndex < gameCards.length - 1 ? 'Next Card' : 'Finish Game'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className='game__controls'>
        <button onClick={resetGame} className='secondary__btn'>Reset Game</button>
        <button onClick={onBack} className='secondary__btn'>Back to Games</button>
      </div>
    </div>
  );
};

export default WordBuilder;