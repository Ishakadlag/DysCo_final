const Card = require("../models/cardModel");
const axios = require('axios');
const dotenv = require('dotenv'); 

dotenv.config()
const CLIENT_ID = process.env.UNSPLASH_ID;

const createCard = async (req, res) => {
  try {
    const userID = req.user;
    const { name, description, imageUrl: providedImageUrl } = req.body; 
    
    let imageUrl = providedImageUrl;
    if (!imageUrl) {
      const response = await axios.get(`https://api.unsplash.com/search/photos/?client_id=${CLIENT_ID}&query=${name}`);
      imageUrl = response?.data?.results?.[1]?.urls?.regular || response?.data?.results?.[0]?.urls?.regular || response?.data?.results?.[0]?.urls?.full || '';
    }

    const card = new Card({
      name,
      description: description || '',
      imageUrl,
      user : userID,
    });

    const newCard = await card.save();

    res.status(201).json({
      message: "Card created successfully",
      newCard
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Card creation unsuccessful",
      error: error.message,
    });
  }
};

const deleteCard = async (req, res) => {
  try {
    const cardID = req.params.id;
    const card = await Card.findById(cardID);
    if (!card) {
      return res.status(404).json({
        message: "Card not found",
      });
    }

    await card.deleteOne();

    return res.status(200).json({
      message: "Card deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Card deletion unsuccessful",
      error: error.message,
    });
  }
};

const updateCard = async (req, res) => {
  try {
    const cardID = req.params.id;
    const { name, description, imageUrl } = req.body;

    const card = await Card.findById(cardID);
    if (!card) {
      return res.status(404).json({
        message: "Card not found",
      });
    }

    if (name) card.name = name;
    if (description !== undefined) card.description = description;
    if (imageUrl) card.imageUrl = imageUrl;

    const updatedCard = await card.save();

    return res.status(200).json({
      message: "Card updated successfully",
      card: updatedCard,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Card update unsuccessful",
      error: error.message,
    });
  }
};

const getAllCards = async (req, res) => {
  try {
    const userID = req.user;

    const cards = await Card.find({ user: userID });

    return res.status(200).json({
      message: "Cards retrieved successfully",
      cards,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error fetching cards",
      error: error.message,
    });
  }
};

const getWordImage = async (req, res) => {
  try {
    const word = req.params.word;
    const response = await axios.get(`https://api.unsplash.com/search/photos/?client_id=${CLIENT_ID}&query=${word}`);
    const imageUrl = response?.data?.results?.[1]?.urls?.regular || response?.data?.results?.[0]?.urls?.regular || response?.data?.results?.[0]?.urls?.full || '';
    
    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Failed to fetch image:", error);
    return res.status(500).json({
      message: "Failed to fetch image",
      error: error.message,
    });
  }
};

module.exports = {
  createCard,
  deleteCard,
  updateCard,
  getAllCards,
  getWordImage,
};
