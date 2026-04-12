import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from "axios";
import { useAuthContext } from '../../hooks/useAuthContext';
import MemoryMatch from './games/MemoryMatch';
import MultipleChoice from './games/MultipleChoice';
import WordBuilder from './games/WordBuilder';
import CategorySort from './games/CategorySort';
import './games/Games.css';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const GamesContainer = () => {
  const [cards, setCards] = useState([]);
  const [activeGame, setActiveGame] = useState('menu');
  const { user } = useAuthContext();

  useEffect(() => {
    const fetchAllCards = async () => {
      try {
        if(user) {
          const config = {
            headers: {
              Authorization: `Bearer ${user?.accessToken}`,
            },
          };
          const response = await axios.get(`${apiURL}/api/v1/card/`, config);
          if(response && response.status == 200 && response.data) {
            setCards(response?.data?.cards);
          }
        }
      } catch(error) {
        console.log(error);
        toast.error(error?.message);
      }
    };
    fetchAllCards();
  }, [user]);

  const renderGame = () => {
    switch(activeGame) {
      case 'memory':
        return <MemoryMatch cards={cards} onBack={() => setActiveGame('menu')} />;
      case 'multiple':
        return <MultipleChoice cards={cards} onBack={() => setActiveGame('menu')} />;
      case 'wordbuilder':
        return <WordBuilder cards={cards} onBack={() => setActiveGame('menu')} />;
      case 'category':
        return <CategorySort cards={cards} onBack={() => setActiveGame('menu')} />;
      default:
        return null;
    }
  };

  if (activeGame !== 'menu') {
    return renderGame();
  }

  return (
    <div className='games__container'>
      <h2>Choose a Game</h2>
      <div className='games__grid'>
        <div className='game__card' onClick={() => setActiveGame('memory')}>
          <h3>🧠 Memory Match</h3>
          <p>Find matching pairs of cards</p>
          <span className='game__level'>Phase 1</span>
        </div>

        <div className='game__card' onClick={() => setActiveGame('multiple')}>
          <h3>✅ Multiple Choice</h3>
          <p>Test your knowledge with choices</p>
          <span className='game__level'>Phase 1</span>
        </div>

        <div className='game__card' onClick={() => setActiveGame('wordbuilder')}>
          <h3>⌨️ Word Builder</h3>
          <p>Type the correct word</p>
          <span className='game__level'>Phase 2</span>
        </div>

        <div className='game__card' onClick={() => setActiveGame('category')}>
          <h3>📂 Category Sort</h3>
          <p>Sort cards into categories</p>
          <span className='game__level'>Phase 2</span>
        </div>
      </div>

      {cards.length === 0 && (
        <p className='no__cards__message'>
          You need to create some flashcards first to play games!
        </p>
      )}
    </div>
  );
};

export default GamesContainer;