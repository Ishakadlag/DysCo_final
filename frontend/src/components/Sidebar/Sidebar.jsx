import React, { useState } from 'react'
import { FaStickyNote, FaMicrophone, FaFileAlt, FaVolumeUp, FaThLarge, FaHeadphones, FaReadme, FaUser, FaGamepad, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import "./Sidebar.css"

const Sidebar = ({ handleButtonClick }) => {
    const [activeTab, setActiveTab] = useState('notes');
    const [isGamesOpen, setIsGamesOpen] = useState(false);
  
    const handleTabClick = (tabName) => {
      setActiveTab(tabName);
      handleButtonClick(tabName);
    }

    const handleSelectChange = (event) => {
      setActiveTab(event.target.value);
      handleButtonClick(event.target.value)
    }
  
    const getTabClassName = (tabName) => {
      return activeTab === tabName ? 'active-tab' : '';
    }
  return (
    <div>
      <div className='sidebar__desktop__container'>
          <span className={`sidebar__btn ${getTabClassName('notes')}`} onClick={() => handleTabClick('notes')}><FaStickyNote className='sidebar__icon' /> Notes</span>
          <span className={`sidebar__btn ${getTabClassName('stt')}`} onClick={() => handleTabClick('stt')}><FaMicrophone className='sidebar__icon' /> Speech To Text</span>
          <span className={`sidebar__btn ${getTabClassName('summary')}`} onClick={() => handleTabClick('summary')}><FaFileAlt className='sidebar__icon' /> Summary</span>
          <span className={`sidebar__btn ${getTabClassName('tts')}`} onClick={() => handleTabClick('tts')}><FaVolumeUp className='sidebar__icon' /> Text To Speech</span>
          <span className={`sidebar__btn ${getTabClassName('cards')}`} onClick={() => handleTabClick('cards')}><FaThLarge className='sidebar__icon' /> Flash Cards</span>
          
          <div className="sidebar__dropdown">
              <span className="sidebar__btn" onClick={() => setIsGamesOpen(!isGamesOpen)}>
                  <FaGamepad className='sidebar__icon' /> Games {isGamesOpen ? <FaChevronUp className="sidebar__dropdown-icon"/> : <FaChevronDown className="sidebar__dropdown-icon"/>}
              </span>
              {isGamesOpen && (
                  <div className="sidebar__dropdown-content">
                      <span className={`sidebar__btn ${getTabClassName('listening')}`} onClick={() => { handleTabClick('listening'); setIsGamesOpen(false); }}><FaHeadphones className='sidebar__icon' /> Listening Game</span>
                      <span className={`sidebar__btn ${getTabClassName('pronunciation')}`} onClick={() => { handleTabClick('pronunciation'); setIsGamesOpen(false); }}><FaReadme className='sidebar__icon' /> Pronunciation Game</span>
                  </div>
              )}
          </div>

          <span className={`sidebar__btn ${getTabClassName('quiz')}`} onClick={() => handleTabClick('quiz')}><FaFileAlt className='sidebar__icon' /> Quiz</span>
          <span className={`sidebar__btn ${getTabClassName('profile')}`} onClick={() => handleTabClick('profile')}><FaUser className='sidebar__icon' /> My Profile</span>
      </div>
      <div className='sidebar__mobile__container'>
        <select value={activeTab} onChange={handleSelectChange}>
          <option value="notes">Notes</option>
          <option value="stt">Speech To Text</option>
          <option value="summary">Summary</option>
          <option value="tts">Text to Speech</option>
          <option value="cards">Flash Cards</option>
          <optgroup label="Games">
              <option value="listening">Listening Game</option>
              <option value="pronunciation">Pronunciation Game</option>
          </optgroup>
          <option value="quiz">Quiz</option>
          <option value="profile">My Profile</option>
        </select>
      </div>
    </div>
  )
}

export default Sidebar