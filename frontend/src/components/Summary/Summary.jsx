import React, { useState, useRef } from 'react'
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../hooks/useAuthContext';
import './Summary.css'
const apiURL = import.meta.env.VITE_BACKEND_URL;

const Summary = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState("")
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const summaryRef = useRef();

  const { user } = useAuthContext();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
  ];

  const handleSummary = async() => {
    try {
      if (!text.trim()) {
        toast.error('Please enter text to summarize');
        return;
      }

      if(user) {
        setLoading(true);
        const config = {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`
          }
        };
        const response = await axios.post(`${apiURL}/api/v1/summary/`, 
          { text, language }, 
          config
        );
        if(response && response.status === 200 && response.data) {
          setSummary(response.data.summary);
          toast.success(`Summary generated (${response.data.compressionRatio})`);
        }
      }
    } catch(error) {
      console.log(error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Summarization failed';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  const handleCopyClick = async () => {
    try {
      const textToCopy = summaryRef.current.textContent;
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Text copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy text to clipboard');
    }
  };

  const handleSaveAsNote = async () => {
    try {
      if (!summary.trim()) {
        toast.error('No summary to save');
        return;
      }

      if (user) {
        setLoading(true);
        const config = {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`
          }
        };

        // Create a note from the summary
        const noteData = {
          title: `Summary - ${new Date().toLocaleDateString()}`,
          content: summary
        };

        const response = await axios.post(
          `${apiURL}/api/v1/note/add`,
          noteData,
          config
        );

        if (response && response.status === 200) {
          toast.success('Summary saved as note!');
          setText('');
          setSummary('');
        }
      }
    } catch (error) {
      console.log(error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to save note';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className='summary__page__container'>
      <h1>Summary</h1>
      <div className='summary__controls'>
        <div className='language__selector'>
          <label>Language: </label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        placeholder="Enter text to summarize"
        value={text}
        onChange={(e) => {setText(e.target.value)}}
      />
      <button 
        className="primary__btn" 
        onClick={handleSummary}
        disabled={loading}
      >
        {loading ? 'Summarizing...' : 'Summarize'}
      </button>
      <div className='summary__content'>
        <div ref={summaryRef}>
          {summary}
        </div>
        {(summary?.length) > 0 && 
          (
            <div className='summary__actions'>
              <button className="secondary__btn" onClick={handleCopyClick}>Copy</button>
              <button className="primary__btn" onClick={handleSaveAsNote} disabled={loading}>
                {loading ? 'Saving...' : 'Save as Note'}
              </button>
            </div>
          )
        }
      </div>
    </div>
  )
}

export default Summary
