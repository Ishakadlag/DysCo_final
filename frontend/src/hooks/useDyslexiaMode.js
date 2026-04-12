import { useState, useEffect } from 'react';

export const useDyslexiaMode = () => {
  const [isDyslexiaMode, setIsDyslexiaMode] = useState(() => {
    const savedMode = localStorage.getItem('dyslexiaMode');
    return savedMode === 'true';
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('dyslexiaTheme');
    if (saved === 'dark') return 'cream';
    return saved || 'cream';
  });

  useEffect(() => {
    // Clear previously applied theme classes to ensure pure transition
    document.body.classList.remove('theme-cream', 'theme-blue');

    if (isDyslexiaMode) {
      document.body.classList.add('dyslexia-mode');
      document.body.classList.add(`theme-${theme}`);
      localStorage.setItem('dyslexiaMode', 'true');
    } else {
      document.body.classList.remove('dyslexia-mode');
      localStorage.setItem('dyslexiaMode', 'false');
    }
  }, [isDyslexiaMode, theme]);

  const toggleDyslexiaMode = () => {
    setIsDyslexiaMode(prev => !prev);
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('dyslexiaTheme', newTheme);
  };

  return { isDyslexiaMode, toggleDyslexiaMode, theme, changeTheme };
};
