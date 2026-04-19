const express = require('express');
const { createCard, deleteCard, updateCard, getAllCards, getWordImage } = require('../controllers/cardController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/add', authMiddleware, createCard);
router.get('/', authMiddleware, getAllCards);
router.delete('/delete/:id', authMiddleware, deleteCard);
router.put('/edit/:id', authMiddleware, updateCard);
router.get('/image/:word', getWordImage);

module.exports = router;
