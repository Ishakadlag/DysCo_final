import React, { useState, useRef } from "react";
import axios from 'axios';
import { AudioRecorder, useAudioRecorder } from 'react-audio-voice-recorder';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useTextContext } from '../../context/TextContext';
import "./SpeechToText.css";

const SpeechToText = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showGameOptions, setShowGameOptions] = useState(false);
  const transcriptRef = useRef(null);

  const { user } = useAuthContext();
  const { updateSharedText } = useTextContext();

  const apiURL = import.meta.env.VITE_BACKEND_URL;

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese (Mandarin)' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'cs', name: 'Czech' },
    { code: 'sk', name: 'Slovak' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'hr', name: 'Croatian' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'et', name: 'Estonian' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'el', name: 'Greek' },
    { code: 'he', name: 'Hebrew' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'id', name: 'Indonesian' },
  ];

  const recorderControls = useAudioRecorder(
    {
      noiseSuppression: true,
      echoCancellation: true,
    },
    (err) => console.log(err)
  );

  const addAudioElement = async (blob) => {
    const url = URL.createObjectURL(blob);
    const buffer = await blob.arrayBuffer();
    const file = new File([buffer], "audio.webm", {
      type: blob.type,
      lastModified: Date.now(),
    });

    setAudioFile(file);

    const audioHolder = document.getElementById('audio');
    if (audioHolder) {
      audioHolder.innerHTML = '';
      const audio = document.createElement('audio');
      audio.src = url;
      audio.controls = true;
      audioHolder.appendChild(audio);
    }
  };

  const handleUpload = async () => {
    if (!audioFile) {
      toast.error('Please record audio first');
      return;
    }

    if (!user) {
      toast.error('Please log in to use this feature');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('language', selectedLanguage);

      const config = {
        headers: {
          Authorization: `Bearer ${user?.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      };

      const response = await axios.post(`${apiURL}/api/v1/speechtotext/`, formData, config);
      if (response?.status === 200) {
        const transcribedText = response?.data?.transcript || '';
        setTranscript(transcribedText);
        updateSharedText(transcribedText);
        setShowGameOptions(false);
        toast.success('Audio transcribed successfully!');
      }
    } catch (error) {
      console.error('Speech to text upload failed:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to transcribe audio';
      toast.error(errorMessage);
    }
  };

  const handleCopyClick = async () => {
    try {
      const textToCopy = transcriptRef.current?.textContent || '';
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text: ', error);
      toast.error('Failed to copy text to clipboard');
    }
  };

  const handleReset = () => {
    setTranscript('');
    setAudioFile(null);
    updateSharedText('');
    const audioHolder = document.getElementById('audio');
    if (audioHolder) {
      audioHolder.innerHTML = '';
    }
    setShowGameOptions(false);
    toast.info('Reset complete. Ready for new recording.');
  };

  const handleUseInGames = () => {
    setShowGameOptions((state) => !state);
  };

  const handleGameSelect = (gameType) => {
    setShowGameOptions(false);
    toast.success(`Text shared! Go to ${gameType === 'listening' ? 'Listening game' : 'Pronunciation game'} in the sidebar.`);
  };

  return (
    <div className="stt__page__container">
      <h1>Speech to text</h1>
      <div className="language-selector">
        <label htmlFor="language">Select Language:</label>
        <select id="language" value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}>
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <AudioRecorder onRecordingComplete={(blob) => addAudioElement(blob)} recorderControls={recorderControls} showVisualizer={true} />
      <button className="primary__btn" onClick={recorderControls.stopRecording}>Stop recording</button>
      <button className="primary__btn" onClick={handleUpload}>SUBMIT</button>

      <div id="audio"></div>

      <div className="stt__content">
        <div ref={transcriptRef}>{transcript}</div>

        {transcript.length > 0 && (
          <>
            <div className="stt__actions">
              <button className="secondary__btn" onClick={handleCopyClick}>Copy</button>
              <button className="secondary__btn cancel__btn" onClick={handleReset}>Reset</button>
              <button className="secondary__btn games__btn" onClick={handleUseInGames}>
                🎮 Use in Games {showGameOptions ? '▲' : '▼'}
              </button>
            </div>

            {showGameOptions && (
              <div className="game__options">
                <button className="game__option__btn" onClick={() => handleGameSelect('listening')}>
                  🎧 Listening Game
                </button>
                <button className="game__option__btn" onClick={() => handleGameSelect('pronunciation')}>
                  🗣️ Pronunciation Game
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SpeechToText;
