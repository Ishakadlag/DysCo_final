import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthContext } from '../../../hooks/useAuthContext';
import './Games.css';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const MultipleChoice = ({ cards, onBack }) => {
  const { user } = useAuthContext();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [gameQuestions, setGameQuestions] = useState([]);
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
      console.error('MultipleChoice progress record error', error);
    }
  };

  useEffect(() => {
    if (gameCompleted && !hasRecorded && gameQuestions.length > 0) {
      const passed = score / gameQuestions.length >= 0.6;
      recordProgress(score, gameQuestions.length, passed, 'flashcards');
      setHasRecorded(true);
    }
  }, [gameCompleted, hasRecorded, score, gameQuestions.length]);


  useEffect(() => {
    if (cards.length >= 4) {
      generateQuestions();
    }
  }, [cards]);

  const generateQuestions = () => {
    const questions = [];
    const usedCards = [...cards];

    // Generate 10 questions or use all cards if less than 10
    const numQuestions = Math.min(10, usedCards.length);

    for (let i = 0; i < numQuestions; i++) {
      const correctCard = usedCards.splice(Math.floor(Math.random() * usedCards.length), 1)[0];
      const wrongOptions = cards
        .filter(card => card._id !== correctCard._id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [correctCard.name, ...wrongOptions.map(card => card.name)]
        .sort(() => Math.random() - 0.5);

      questions.push({
        card: correctCard,
        question: `What is this object?`,
        options,
        correctAnswer: correctCard.name
      });
    }

    setGameQuestions(questions);
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setSelectedAnswer(null);
    setGameCompleted(false);
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
    setShowResult(true);

    if (answer === gameQuestions[currentQuestion].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < gameQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setShowResult(false);
      setSelectedAnswer(null);
    } else {
      setGameCompleted(true);
    }
  };

  const resetGame = () => {
    generateQuestions();
    setHasRecorded(false);
  };

  if (cards.length < 4) {
    return (
      <div className='game__container'>
        <h2>✅ Multiple Choice</h2>
        <p>You need at least 4 flashcards to play this game!</p>
        <button onClick={onBack} className='secondary__btn'>Back to Games</button>
      </div>
    );
  }

  if (gameCompleted) {
    const percentage = Math.round((score / gameQuestions.length) * 100);
    return (
      <div className='game__container'>
        <h2>✅ Multiple Choice - Results</h2>
        <div className='game__results'>
          <h3>Game Completed!</h3>
          <p>Score: {score}/{gameQuestions.length} ({percentage}%)</p>
          <div className='result__message'>
            {percentage >= 80 ? '🎉 Excellent!' :
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

  const question = gameQuestions[currentQuestion];

  return (
    <div className='game__container'>
      <div className='game__header'>
        <h2>✅ Multiple Choice</h2>
        <div className='game__stats'>
          <span>Question: {currentQuestion + 1}/{gameQuestions.length}</span>
          <span>Score: {score}</span>
        </div>
      </div>

      {question && (
        <div className='question__container'>
          <div className='question__card'>
            <img src={question.card.imageUrl} alt={question.card.name} />
          </div>

          <h3>{question.question}</h3>

          <div className='options__container'>
            {question.options.map((option, index) => (
              <button
                key={index}
                className={`option__btn ${
                  showResult
                    ? option === question.correctAnswer
                      ? 'correct'
                      : option === selectedAnswer
                        ? 'incorrect'
                        : ''
                    : ''
                }`}
                onClick={() => !showResult && handleAnswerSelect(option)}
                disabled={showResult}
              >
                {option}
              </button>
            ))}
          </div>

          {showResult && (
            <div className='result__feedback'>
              {selectedAnswer === question.correctAnswer ? (
                <p className='correct__feedback'>✅ Correct!</p>
              ) : (
                <p className='incorrect__feedback'>
                  ❌ Wrong! The correct answer is: <strong>{question.correctAnswer}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className='game__controls'>
        {showResult && (
          <button onClick={nextQuestion} className='primary__btn'>
            {currentQuestion < gameQuestions.length - 1 ? 'Next Question' : 'Finish Game'}
          </button>
        )}
        <button onClick={resetGame} className='secondary__btn'>Reset Game</button>
        <button onClick={onBack} className='secondary__btn'>Back to Games</button>
      </div>
    </div>
  );
};

export default MultipleChoice;