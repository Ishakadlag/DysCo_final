import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from "axios";
import { useAuthContext } from '../../hooks/useAuthContext';
import CardComponent from './CardComponent';
import './FlashCards.css'
const apiURL = import.meta.env.VITE_BACKEND_URL;

const FlashCardsContainer = () => {

  const [cards, setCards] = useState([]);
  const { user } = useAuthContext()

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
            setCards(response?.data?.cards)
          }
        }
      } catch(error) {
        console.log(error);
        toast.error(error?.message);
      }
    }
    fetchAllCards();
  }, [user]);

  return (
    <div className='cards__container'>
      {cards?.length > 0 ? (
        cards.map((card) => (
          <CardComponent key={card._id} id={card._id} name={card.name} description={card.description} imageUrl={card.imageUrl} />
        ))
      ) : (
        <h1>No cards present</h1>
      )}
    </div>  
  )
}

export default FlashCardsContainer