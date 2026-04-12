import React, { useState} from 'react';
import ObjectDetector from './ObjectDetector';
import CardsContainer from './CardsContainer';
import GamesContainer from './GamesContainer';

const FlashCards = () => {

  const [ activeTab, setActiveTab ] = useState('cards');

  const showCardsHandle = () => {
    setActiveTab('cards')
  }

  const addCardsHandle = () => {
    setActiveTab('cam')
  }

  const showGamesHandle = () => {
    setActiveTab('games')
  }

  return (
    <div className='cards__page__wrapper'>
      <h1>Flash Cards</h1>
      <div className='tabs__container'>
        <button onClick={showCardsHandle} className='secondary__btn'>FLASHCARDS</button>
        <button onClick={showGamesHandle} className='secondary__btn'>GAMES</button>
        <button onClick={addCardsHandle} className='secondary__btn'>NEW CARD</button>
      </div>
      { activeTab === "cards" ? (
        <CardsContainer />
      ) : activeTab === "games" ? (
        <GamesContainer />
      ) : (
        <ObjectDetector />
      )}
    </div>
  )
}

export default FlashCards