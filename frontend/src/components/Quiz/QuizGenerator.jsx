import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../hooks/useAuthContext';
import './Quiz.css';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const QuizGenerator = () => {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [quizType, setQuizType] = useState('multiple-choice');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const { user } = useAuthContext();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.accessToken}`
        }
      };
      const response = await axios.get(`${apiURL}/api/v1/note/all`, config);
      if (response.data.notes) {
        setNotes(response.data.notes);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      console.log('Full error:', error);
    }
  };

  const generateQuiz = async () => {
    if (!selectedNote) {
      toast.error('Please select a note');
      return;
    }

    if (loadingRef.current) {
      toast.info('Quiz generation is already processing. Please wait.');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.accessToken}`
        }
      };

      const response = await axios.post(
        `${apiURL}/api/v1/quiz/create`,
        {
          noteId: selectedNote,
          quizType,
          questionCount
        },
        config
      );

      if (response.data.quiz) {
        toast.success('Quiz generated successfully!');
        // Navigate to quiz taking page
        window.location.href = `/quiz/take/${response.data.quiz._id}`;
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      console.error('Error response:', error.response?.data);
      const backendMessage = error?.response?.data?.message;
      const backendDetail = error?.response?.data?.error || error?.response?.data?.details;
      if (error?.response?.status === 429) {
        toast.error(`Quota Exceeded: ${backendDetail || 'Please check your OpenAI billing details.'}`);
      } else if (backendDetail) {
        toast.error(`${backendMessage || 'Failed to generate quiz'}: ${backendDetail}`);
      } else {
        toast.error(backendMessage || error?.message || 'Failed to generate quiz');
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="quiz-generator-container">
      <h1>🎯 Quiz Generator</h1>
      <p className="subtitle">Create engaging quizzes from your notes to test and reinforce your knowledge</p>

      <div className="generator-form">
        <div className="form-group">
          <label>📝 Select a Note:</label>
          <select
            value={selectedNote || ''}
            onChange={(e) => setSelectedNote(e.target.value)}
            className="form-select"
          >
            <option value="">-- Choose a note to create a quiz --</option>
            {notes.length > 0 ? (
              notes.map((note) => (
                <option key={note._id} value={note._id}>
                  {note.title}
                </option>
              ))
            ) : (
              <option value="">No notes available - create a note first</option>
            )}
          </select>
          {selectedNote && (
            <small style={{ opacity: 0.8, marginTop: '0.5rem' }}>
              ✓ Note selected for quiz generation
            </small>
          )}
        </div>

        <div className="form-group">
          <label>❓ Question Type:</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select
              value={quizType}
              onChange={(e) => setQuizType(e.target.value)}
              className="form-select"
              style={{ flex: 1 }}
            >
              <option value="multiple-choice">Multiple Choice - Standard comprehension</option>
              <option value="summary-comprehension">Summary Comprehension - Advanced thinking</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>🔢 Number of Questions:</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input
              type="number"
              min="1"
              max="20"
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.max(1, Math.min(20, parseInt(e.target.value))))}
              className="form-input"
              style={{ flex: 1 }}
            />
            <span style={{ opacity: 0.8, whiteSpace: 'nowrap' }}>({questionCount}/20)</span>
          </div>
        </div>

        <button
          className="btn-generate"
          onClick={generateQuiz}
          disabled={loading || !selectedNote}
        >
          {loading ? (
            <>
              <span>⏳ Generating Quiz...</span>
            </>
          ) : (
            <>
              <span>✨ Generate Quiz</span>
            </>
          )}
        </button>

        {selectedNote && !loading && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '1rem',
            borderRadius: '10px',
            fontSize: '0.95rem',
            lineHeight: '1.6',
            marginTop: '0.5rem'
          }}>
            <strong>💡 Tip:</strong> Selecting {questionCount} {quizType === 'multiple-choice' ? 'comprehension' : 'analytical'} questions will help you understand the material better!
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizGenerator;
