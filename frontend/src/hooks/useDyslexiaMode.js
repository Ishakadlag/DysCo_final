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
    // Listen for custom event
    const handleSync = () => {
      setIsDyslexiaMode(localStorage.getItem('dyslexiaMode') === 'true');
      const savedTheme = localStorage.getItem('dyslexiaTheme');
      if (savedTheme) {
         setTheme(savedTheme === 'dark' ? 'cream' : savedTheme);
      }
    };
    window.addEventListener('dyslexia-sync', handleSync);
    return () => window.removeEventListener('dyslexia-sync', handleSync);
  }, []);

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
    setIsDyslexiaMode(prev => {
      const newVal = !prev;
      localStorage.setItem('dyslexiaMode', String(newVal));
      window.dispatchEvent(new Event('dyslexia-sync'));
      return newVal;
    });
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('dyslexiaTheme', newTheme);
    window.dispatchEvent(new Event('dyslexia-sync'));
  };

  return { isDyslexiaMode, toggleDyslexiaMode, theme, changeTheme };
};
