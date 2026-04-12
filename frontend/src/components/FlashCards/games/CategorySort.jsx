import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthContext } from '../../../hooks/useAuthContext';
import './Games.css';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const CategorySort = ({ cards, onBack }) => {
  const { user } = useAuthContext();
  const [gameCards, setGameCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [draggedCard, setDraggedCard] = useState(null);
  const [score, setScore] = useState(0);
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
    } catch (err) {
      console.error('CategorySort progress record error', err);
    }
  };

  useEffect(() => {
    if (gameCompleted && !hasRecorded) {
      const passed = score >= gameCards.length * 0.6;
      recordProgress(score, gameCards.length, passed, 'flashcards');
      setHasRecorded(true);
    }
  }, [gameCompleted, hasRecorded, score, gameCards.length]);

  useEffect(() => {
    if (cards.length >= 8) {
      initializeGame();
    }
  }, [cards]);

  const initializeGame = () => {
    // Create categories based on card names (first letter or type)
    const cardCategories = {};
    cards.forEach(card => {
      const category = card.name.charAt(0).toUpperCase(); // Group by first letter
      if (!cardCategories[category]) {
        cardCategories[category] = [];
      }
      cardCategories[category].push(card);
    });

    // Select categories with at least 2 cards
    let validCategories = Object.keys(cardCategories).filter(cat =>
      cardCategories[cat].length >= 2
    );

    if (validCategories.length < 2) {
      // If not enough categories, create artificial ones
      const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
      const half = Math.ceil(shuffledCards.length / 2);
      cardCategories['Group A'] = shuffledCards.slice(0, half);
      cardCategories['Group B'] = shuffledCards.slice(half);
      validCategories = ['Group A', 'Group B'];
    }

    // Select 2 categories and mix their cards
    const selectedCategories = validCategories.slice(0, 2);
    const mixedCards = [];
    const categoryAssignments = {};

    selectedCategories.forEach((category, index) => {
      const categoryCards = cardCategories[category];
      categoryCards.forEach(card => {
        mixedCards.push({
          ...card,
          correctCategory: category,
          currentCategory: null
        });
        categoryAssignments[card._id] = category;
      });
    });

    // Shuffle the mixed cards
    const shuffledMixedCards = mixedCards.sort(() => Math.random() - 0.5);

    setGameCards(shuffledMixedCards);
    setCategories(selectedCategories.map(cat => ({
      name: cat,
      cards: []
    })));
    setScore(0);
    setGameCompleted(false);
  };

  const handleDragStart = (e, card) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, categoryName) => {
    e.preventDefault();

    if (!draggedCard) return;

    // Update card's current category
    setGameCards(prevCards =>
      prevCards.map(card =>
        card._id === draggedCard._id
          ? { ...card, currentCategory: categoryName }
          : card
      )
    );

    // Update categories
    setCategories(prevCategories =>
      prevCategories.map(category => {
        if (category.name === categoryName) {
          return {
            ...category,
            cards: [...category.cards, draggedCard]
          };
        } else {
          return {
            ...category,
            cards: category.cards.filter(card => card._id !== draggedCard._id)
          };
        }
      })
    );

    setDraggedCard(null);

    // Evaluate updated game state
    const updatedCards = gameCards.map(card =>
      card._id === draggedCard._id
        ? { ...card, currentCategory: categoryName }
        : card
    );

    const allPlaced = updatedCards.every(card => card.currentCategory !== null);
    if (allPlaced) {
      const correctPlacements = updatedCards.reduce(
        (count, card) => (card.currentCategory === card.correctCategory ? count + 1 : count),
        0
      );
      setScore(correctPlacements);
      setGameCompleted(true);
    }
  };

  const checkGameCompletion = () => {
    const allPlaced = gameCards.every(card => card.currentCategory !== null);
    if (allPlaced) {
      const correctPlacements = gameCards.reduce(
        (count, card) => (card.currentCategory === card.correctCategory ? count + 1 : count),
        0
      );
      setScore(correctPlacements);
      setGameCompleted(true);
    }
  };

  const resetGame = () => {
    initializeGame();
    setHasRecorded(false);
  };

  if (cards.length < 8) {
    return (
      <div className='game__container'>
        <h2>📂 Category Sort</h2>
        <p>You need at least 8 flashcards to play this game!</p>
        <button onClick={onBack} className='secondary__btn'>Back to Games</button>
      </div>
    );
  }

  if (gameCompleted) {
    const percentage = Math.round((score / gameCards.length) * 100);
    return (
      <div className='game__container'>
        <h2>📂 Category Sort - Results</h2>
        <div className='game__results'>
          <h3>Game Completed!</h3>
          <p>Score: {score}/{gameCards.length} ({percentage}%)</p>
          <div className='result__message'>
            {percentage >= 80 ? '🎉 Perfect sorting!' :
             percentage >= 60 ? '👍 Well done!' :
             percentage >= 40 ? '🤔 Getting there!' :
             '📚 Keep practicing!'}
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
        <h2>📂 Category Sort</h2>
        <p>Drag cards to their correct categories</p>
      </div>

      <div className='sort__game__container'>
        <div className='cards__pool'>
          <h3>Unsorted Cards</h3>
          <div className='unsorted__cards'>
            {gameCards
              .filter(card => card.currentCategory === null)
              .map(card => (
                <div
                  key={card._id}
                  className='sortable__card'
                  draggable
                  onDragStart={(e) => handleDragStart(e, card)}
                >
                  <img src={card.imageUrl} alt={card.name} />
                  <p>{card.name}</p>
                </div>
              ))}
          </div>
        </div>

        <div className='categories__container'>
          {categories.map(category => (
            <div
              key={category.name}
              className='category__dropzone'
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, category.name)}
            >
              <h3>{category.name}</h3>
              <div className='category__cards'>
                {category.cards.map(card => (
                  <div
                    key={card._id}
                    className='sortable__card placed'
                    draggable
                    onDragStart={(e) => handleDragStart(e, card)}
                  >
                    <img src={card.imageUrl} alt={card.name} />
                    <p>{card.name}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='game__controls'>
        <button onClick={resetGame} className='secondary__btn'>Reset Game</button>
        <button onClick={onBack} className='secondary__btn'>Back to Games</button>
      </div>
    </div>
  );
};

export default CategorySort;