import React from 'react';
import { useDyslexiaMode } from '../../hooks/useDyslexiaMode';
import './DyslexiaToggle.css';

const DyslexiaToggle = () => {
  const { isDyslexiaMode, toggleDyslexiaMode, theme, changeTheme } = useDyslexiaMode();

  return (
    <div className="dyslexia-toggle-wrapper">
      {isDyslexiaMode && (
        <div className="theme-selector-wrapper" style={{ marginRight: '10px' }}>
          <select 
            value={theme} 
            onChange={(e) => changeTheme(e.target.value)}
            className="theme-dropdown"
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
          >
            <option value="cream">Cream</option>
            <option value="blue">Light Blue</option>
          </select>
        </div>
      )}

      <span className="dyslexia-label">Dyslexia Mode {isDyslexiaMode ? 'ON' : 'OFF'}</span>
      <label className="toggle-switch">
        <input 
          type="checkbox" 
          checked={isDyslexiaMode} 
          onChange={toggleDyslexiaMode} 
        />
        <span className="slider round"></span>
      </label>
    </div>
  );
};

export default DyslexiaToggle;
