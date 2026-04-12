import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthContext } from '../../../hooks/useAuthContext';
import './Games.css';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const MemoryMatch = ({ cards, onBack }) => {
  const { user } = useAuthContext();
  const [gameCards, setGameCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
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
      console.error('MemoryMatch progress record error', error);
    }
  };

  useEffect(() => {
    if (gameWon && !hasRecorded) {
      const scoreValue = matchedCards.length;
      const totalValue = cards.slice(0, 6).length;
      const passed = scoreValue / totalValue >= 0.6;
      recordProgress(scoreValue, totalValue, passed, 'flashcards');
      setHasRecorded(true);
    }
  }, [gameWon, hasRecorded, matchedCards.length, cards.length]);


  useEffect(() => {
    if (cards.length >= 4) {
      initializeGame();
    }
  }, [cards]);

  const initializeGame = () => {
    // Take first 6 cards and create pairs
    const selectedCards = cards.slice(0, 6);
    const pairedCards = [...selectedCards, ...selectedCards].map((card, index) => ({
      ...card,
      uniqueId: `${card._id}-${index}`,
      isFlipped: false,
      isMatched: false
    }));

    // Shuffle the cards
    const shuffledCards = pairedCards.sort(() => Math.random() - 0.5);
    setGameCards(shuffledCards);
    setFlippedCards([]);
    setMatchedCards([]);
    setMoves(0);
    setGameWon(false);
  };

  const handleCardClick = (card) => {
    if (flippedCards.length === 2 || card.isFlipped || card.isMatched) return;

    const newFlippedCards = [...flippedCards, card];
    setFlippedCards(newFlippedCards);

    // Update card flip state
    setGameCards(prevCards =>
      prevCards.map(c =>
        c.uniqueId === card.uniqueId ? { ...c, isFlipped: true } : c
      )
    );

    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);

      const [firstCard, secondCard] = newFlippedCards;

      if (firstCard._id === secondCard._id) {
        // Match found
        setTimeout(() => {
          setMatchedCards(prev => [...prev, firstCard._id]);
          setGameCards(prevCards =>
            prevCards.map(c =>
              c._id === firstCard._id ? { ...c, isMatched: true } : c
            )
          );
          setFlippedCards([]);

          // Check if game is won
          if (matchedCards.length + 1 === cards.slice(0, 6).length) {
            setGameWon(true);
          }
        }, 1000);
      } else {
        // No match
        setTimeout(() => {
          setGameCards(prevCards =>
            prevCards.map(c =>
              c.uniqueId === firstCard.uniqueId || c.uniqueId === secondCard.uniqueId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const resetGame = () => {
    initializeGame();
    setHasRecorded(false);
  };

  if (cards.length < 4) {
    return (
      <div className='game__container'>
        <h2>🧠 Memory Match</h2>
        <p>You need at least 4 flashcards to play this game!</p>
        <button onClick={onBack} className='secondary__btn'>Back to Games</button>
      </div>
    );
  }

  return (
    <div className='game__container'>
      <div className='game__header'>
        <h2>🧠 Memory Match</h2>
        <div className='game__stats'>
          <span>Moves: {moves}</span>
          <span>Matches: {matchedCards.length}/{cards.slice(0, 6).length}</span>
        </div>
      </div>

      {gameWon && (
        <div className='game__won'>
          <h3>🎉 Congratulations!</h3>
          <p>You completed the game in {moves} moves!</p>
          <button onClick={resetGame} className='primary__btn'>Play Again</button>
        </div>
      )}

      <div className='memory__grid'>
        {gameCards.map((card) => (
          <div
            key={card.uniqueId}
            className={`memory__card ${card.isFlipped || card.isMatched ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
            onClick={() => handleCardClick(card)}
          >
            <div className='memory__card__inner'>
              <div className='memory__card__front'>
                <div className='card__back'>?</div>
              </div>
              <div className='memory__card__back'>
                <img src={card.imageUrl} alt={card.name} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='game__controls'>
        <button onClick={resetGame} className='secondary__btn'>Reset Game</button>
        <button onClick={onBack} className='secondary__btn'>Back to Games</button>
      </div>
    </div>
  );
};

export default MemoryMatch;