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
  const [totalPairs, setTotalPairs] = useState(0);
  const [offsetIndex, setOffsetIndex] = useState(0);

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
    if (gameWon && !hasRecorded && totalPairs > 0) {
      const scoreValue = matchedCards.length;
      const totalValue = totalPairs;
      const passed = scoreValue / totalValue >= 0.6;
      recordProgress(scoreValue, totalValue, passed, 'flashcards');
      setHasRecorded(true);
    }
  }, [gameWon, hasRecorded, matchedCards.length, totalPairs]);


  useEffect(() => {
    if (cards.length >= 4) {
      initializeGame(true);
    }
  }, [cards]);

  const initializeGame = (resetOffset = false) => {
    let startIndex = resetOffset ? 0 : offsetIndex;
    
    // Wrap around if we exceed the array length
    if (startIndex >= cards.length) {
      startIndex = 0;
    }

    // Grab up to 6 unique cards sequentially (12 cards total on board)
    let selectedCards = cards.slice(startIndex, startIndex + 6);

    // If we're at the end of the deck and don't quite have 6 cards, wrap around to borrow from the beginning
    // Only do this if the user actually has at least 6 total cards!
    if (selectedCards.length < 6 && cards.length >= 6) {
      const remainingNeeded = 6 - selectedCards.length;
      selectedCards = [...selectedCards, ...cards.slice(0, remainingNeeded)];
    }

    // Update the offset index for the next game round
    setOffsetIndex((startIndex + 6) % cards.length);
    setTotalPairs(selectedCards.length);

    const pairedCards = [...selectedCards, ...selectedCards].map((card, index) => ({
      ...card,
      uniqueId: `${card._id}-${index}`,
      isFlipped: false,
      isMatched: false
    }));

    // Shuffle the cards on the board
    const shuffledPairs = pairedCards.sort(() => Math.random() - 0.5);
    setGameCards(shuffledPairs);
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
          if (matchedCards.length + 1 === totalPairs) {
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
    initializeGame(false);
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
          <span>Matches: {matchedCards.length}/{totalPairs}</span>
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