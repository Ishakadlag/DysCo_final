import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../hooks/useAuthContext';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const InteractiveWord = ({ wordObj, fullText, isDyslexiaMode, isHighlighted, selectedVoice, speechRate, showVisuals = true }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [meaningData, setMeaningData] = useState(null);
  const [loadingMeaning, setLoadingMeaning] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  
  // Visual popup states
  const [showVisualPopup, setShowVisualPopup] = useState(false);
  const [popupImage, setPopupImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  const { user } = useAuthContext();

  // Clean punctuation from word for API and TTS
  const cleanWord = wordObj.word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();

  // Basic heuristic to split word into syllables
  const getSyllables = (word) => {
    if (word.length <= 3) return [word];
    const match = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
    return match || [word];
  };

  const handleMouseEnter = async () => {
    if (showVisualPopup) return; // don't show tooltip if popup is open
    setShowTooltip(true);
    if (!meaningData && cleanWord && !loadingMeaning) {
      setLoadingMeaning(true);
      try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
             setMeaningData(data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch meaning", err);
      } finally {
        setLoadingMeaning(false);
      }
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const fetchWordImage = async () => {
    setImageLoading(true);
    try {
      const response = await axios.get(`${apiURL}/api/v1/card/image/${cleanWord}`);
      if (response && response.status === 200 && response.data?.imageUrl) {
        setPopupImage(response.data.imageUrl);
      } else {
        setPopupImage(null);
      }
    } catch (error) {
      console.error("Failed to fetch image", error);
      setPopupImage(null);
    } finally {
      setImageLoading(false);
    }
  };

  const handleWordClick = (e) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent accidental double clicks
    
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);

    if (cleanWord) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanWord);
      if (selectedVoice) utterance.voice = selectedVoice;
      if (speechRate) utterance.rate = speechRate;
      window.speechSynthesis.speak(utterance);
    }
    
    if (showVisuals) {
      setShowTooltip(false);
      setShowVisualPopup(true);
      if (!popupImage) {
        fetchWordImage();
      }
    } else {
      setShowTooltip(true);
    }
  };

  const handleSentenceClick = (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!fullText) return;
    
    // Detect full sentence containing the clicked word
    const text = fullText;
    const startIndex = wordObj.startIndex;
    
    const beforePart = text.substring(0, startIndex);
    const afterPart = text.substring(startIndex);
    
    const lastPunctuation = Math.max(
      beforePart.lastIndexOf('.'), 
      beforePart.lastIndexOf('!'), 
      beforePart.lastIndexOf('?')
    );
    const sentenceStart = lastPunctuation === -1 ? 0 : lastPunctuation + 1;
    
    let endMatch = afterPart.match(/[.?!]/);
    const sentenceEnd = endMatch ? startIndex + endMatch.index + 1 : text.length;
    
    const fullSentence = text.substring(sentenceStart, sentenceEnd).trim();
    
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullSentence);
    if (selectedVoice) utterance.voice = selectedVoice;
    if (speechRate) utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  };
  
  const saveToFlashcard = async (e) => {
    e.stopPropagation();
    try {
      if(!user) {
         toast.error("Please login to save flashcards");
         return;
      }
      const config = {
        headers: {
          Authorization: `Bearer ${user?.accessToken}`,
        },
      };
      
      const definition = meaningData?.meanings?.[0]?.definitions?.[0]?.definition || '';
      
      const response = await axios.post(`${apiURL}/api/v1/card/add`, {
        name: cleanWord,
        description: definition,
        imageUrl: popupImage
      }, config);
      
      if(response && response.status === 201) {
        toast.success("Saved to flashcards!");
      }
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to save flashcard");
    }
  };

  const closePopup = (e) => {
    e.stopPropagation();
    setShowVisualPopup(false);
  };

  const syllables = getSyllables(wordObj.word);
  
  const definitionText = meaningData?.meanings?.[0]?.definitions?.[0]?.definition;
  const phoneticsText = meaningData?.phonetics?.[0]?.text;

  return (
    <>
    <span 
      className={`interactive-word-wrapper ${isDyslexiaMode ? 'dyslexia-mode' : 'normal-mode'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleWordClick}
      onDoubleClick={handleSentenceClick}
      onContextMenu={handleSentenceClick}
    >
      <span className={`tts-span-word ${isHighlighted ? 'highlighted-word' : ''} ${isClicked ? 'clicked-word' : ''}`}>
        {isDyslexiaMode ? (
          syllables.map((syl, idx) => (
            <React.Fragment key={idx}>
              <span className="syllable">{syl}</span>
              {idx < syllables.length - 1 && <span className="syllable-separator">&middot;</span>}
            </React.Fragment>
          ))
        ) : (
          wordObj.word
        )}
      </span>
      {' '}
      {/* Tooltip */}
      {showTooltip && meaningData && !showVisualPopup && (
        <div className={`word-tooltip ${isDyslexiaMode ? 'tooltip-dyslexia' : 'tooltip-normal'}`}>
          <div className="tooltip-header">
            <strong>{cleanWord}</strong>
            {phoneticsText && <span className="phonetic">{phoneticsText}</span>}
          </div>
          <div className="tooltip-body">
            {definitionText && (
              <p className="definition">{definitionText}</p>
            )}
            {isDyslexiaMode && meaningData.meanings?.[0]?.definitions?.[0]?.example && (
              <p className="example">"{meaningData.meanings[0].definitions[0].example}"</p>
            )}
          </div>
        </div>
      )}
    </span>
    
    {/* Visual Vocabulary Popup Modal */}
    {showVisualPopup && (
      <div className="visual-popup-overlay" onClick={closePopup}>
        <div 
          className={`visual-popup-content ${isDyslexiaMode ? 'popup-dyslexia' : 'popup-normal'}`} 
          onClick={(e) => e.stopPropagation()}
        >
          <button className="popup-close-btn" onClick={closePopup}>&times;</button>
          
          <div className="popup-header">
            <h2>{cleanWord}</h2>
            {phoneticsText && <span className="popup-phonetic">{phoneticsText}</span>}
          </div>
          
          <div className="popup-image-container">
            {imageLoading ? (
              <div className="popup-loading">Loading image...</div>
            ) : popupImage ? (
              <img src={popupImage} alt={cleanWord} className="popup-image" />
            ) : (
              <div className="popup-no-image">No image found</div>
            )}
          </div>
          
          <div className="popup-body">
            {definitionText ? (
              <p className="popup-meaning"><strong>Meaning:</strong> {definitionText}</p>
            ) : (
              <p className="popup-meaning"><em>No definition available.</em></p>
            )}
          </div>
          
          <div className="popup-footer">
            <button className="primary__btn popup-save-btn" onClick={saveToFlashcard}>
              Save to Flashcard
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default InteractiveWord;
