import React, { createContext, useContext, useState } from 'react';

const TextContext = createContext();

export const useTextContext = () => {
  const context = useContext(TextContext);
  if (!context) {
    throw new Error('useTextContext must be used within a TextProvider');
  }
  return context;
};

export const TextProvider = ({ children }) => {
  const [sharedText, setSharedText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(null);

  const updateSharedText = (text) => {
    setSharedText(text);
  };

  const updateSelectedVoice = (voice) => {
    setSelectedVoice(voice);
  };

  return (
    <TextContext.Provider value={{
      sharedText,
      selectedVoice,
      updateSharedText,
      updateSelectedVoice
    }}>
      {children}
    </TextContext.Provider>
  );
};