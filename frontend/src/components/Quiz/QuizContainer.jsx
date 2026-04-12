import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../hooks/useAuthContext';
import DyslexiaToggle from '../DyslexiaToggle/DyslexiaToggle';
import './Quiz.css';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const QuizContainer = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quiz?.timeLimit && !submitted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [quiz, submitted]);

  const fetchQuiz = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.accessToken}`
        }
      };

      const response = await axios.get(`${apiURL}/api/v1/quiz/${quizId}`, config);
      setQuiz(response.data.quiz);
      setAnswers(new Array(response.data.quiz.questions.length).fill(''));

      if (response.data.quiz.timeLimit) {
        setTimeLeft(response.data.quiz.timeLimit * 60); // Convert to seconds
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionText) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionText;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (answers.some((a) => a === '')) {
      const unanswered = answers.filter((a) => a === '').length;
      const confirm = window.confirm(
        `You have ${unanswered} unanswered question(s). Submit anyway?`
      );
      if (!confirm) return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user?.accessToken}`
        }
      };

      const response = await axios.post(
        `${apiURL}/api/v1/quiz/submit`,
        { quizId, answers },
        config
      );

      setResults(response.data);
      setSubmitted(true);
      toast.success('Quiz submitted successfully!');

      // send progress record to profile analytics
      try {
        const recordResp = await axios.post(
          `${apiURL}/api/v1/progress/record`,
          {
            gameType: 'quiz',
            score: response.data.score,
            total: response.data.totalQuestions,
            passed: response.data.passed,
            metadata: {
              notesId: quiz?.noteId || null,
              attempts: 1
            }
          },
          { headers: { Authorization: `Bearer ${user?.accessToken}` } }
        );

        const progressRecord = recordResp.data.progress;
        console.log('Quiz progress recorded', progressRecord);

        // trigger dashboard refresh
        window.dispatchEvent(new CustomEvent('progressUpdated', { detail: { record: progressRecord } }));
      } catch (err) {
        console.error('Could not record quiz progress', err);
      }

    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    }
  };

  if (loading) {
    return <div className="quiz-loading">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="quiz-error">Quiz not found</div>;
  }

  if (submitted && results) {
    return (
      <div className="quiz-results-container">
        <div className="results-header">
          <div className="results-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn-back" onClick={() => navigate('/home')}>
                ← Back to Dashboard
              </button>
              <DyslexiaToggle />
            </div>
            <h1>Quiz Results</h1>
          </div>
          <div className={`score-badge ${results.passed ? 'passed' : 'failed'}`}>
            {results.score}%
          </div>
        </div>

        <div className="results-summary">
          <p className="result-message">
            {results.passed ? '🎉 Congratulations!' : 'Keep practicing!'}
          </p>
          <p>
            You got <strong>{results.correctAnswers}</strong> out of{' '}
            <strong>{results.totalQuestions}</strong> correct
          </p>
          <p>Passing score: {results.passingScore}%</p>
          <p className={results.passed ? 'text-success' : 'text-danger'}>
            Status: <strong>{results.passed ? 'PASSED' : 'FAILED'}</strong>
          </p>
        </div>

        <div className="results-details">
          <h2>📚 Answer Review & Learning</h2>
          {results.results.map((result, idx) => (
            <div
              key={idx}
              className={`result-item ${result.isCorrect ? 'correct' : 'incorrect'}`}
            >
              <div className="result-question">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {result.isCorrect ? '✅' : '❌'}
                  </span>
                  <strong>Q{result.questionIndex + 1}: {result.question}</strong>
                </div>
              </div>
              <div className="result-answer">
                <div style={{ marginBottom: '0.75rem' }}>
                  <p><strong>Your Answer:</strong> <span className={result.isCorrect ? 'correct-text' : 'incorrect-text'}>
                    {result.userAnswer || '(Not answered)'}
                  </span></p>
                </div>

                {!result.isCorrect && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p><strong>Correct Answer:</strong> <span className="correct-text">{result.correctAnswer}</span></p>
                  </div>
                )}

                {result.explanation && (
                  <div className="explanation-box">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem', marginTop: '0.1rem', flexShrink: 0 }}>💡</span>
                      <div>
                        <strong>Why?</strong>
                        <p style={{ margin: '0.5rem 0 0 0', lineHeight: '1.6' }}>{result.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className="btn-retake" onClick={() => navigate('/quiz')}>
          Take Another Quiz
        </button>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn-back" onClick={() => navigate('/home')}>
              ← Back to Dashboard
            </button>
            <DyslexiaToggle />
          </div>
          <h1>{quiz.title}</h1>
        </div>
        <div className="quiz-info">
          <span>Question {currentQuestion + 1} of {quiz.totalQuestions}</span>
          {timeLeft !== null && (
            <span className="time-left">
              Time: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentQuestion + 1) / quiz.totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="quiz-content">
        <div className="question-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span className="question-number">Question {currentQuestion + 1}/{quiz.totalQuestions}</span>
            {question.difficulty && (
              <span className={`difficulty-badge ${question.difficulty.toLowerCase()}`}>
                {question.difficulty}
              </span>
            )}
            {question.category && (
              <span style={{
                display: 'inline-block',
                background: 'rgba(102, 126, 234, 0.2)',
                color: '#667eea',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                📚 {question.category}
              </span>
            )}
          </div>

          <h2 className="question-text">{question.question}</h2>

          <div className="options-container">
            {question.options.map((option, idx) => (
              <label key={idx} className="option-label">
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  value={option.text}
                  checked={answers[currentQuestion] === option.text}
                  onChange={() => handleAnswerSelect(option.text)}
                />
                <span className="option-text">{option.text}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="difficulty-badge">
          Difficulty: <strong>{question.difficulty}</strong>
        </div>
      </div>

      <div className="quiz-navigation">
        <button
          className="btn-nav"
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          ← Previous
        </button>

        <div className="question-counter">
          {currentQuestion + 1} / {quiz.totalQuestions}
        </div>

        {currentQuestion === quiz.totalQuestions - 1 ? (
          <button className="btn-submit" onClick={handleSubmit}>
            Submit Quiz
          </button>
        ) : (
          <button className="btn-nav" onClick={handleNext}>
            Next →
          </button>
        )}
      </div>

      <div className="question-map">
        <h4>Questions:</h4>
        <div className="question-indicators">
          {quiz.questions.map((_, idx) => (
            <button
              key={idx}
              className={`indicator ${idx === currentQuestion ? 'current' : ''} ${answers[idx] !== '' ? 'answered' : ''
                }`}
              onClick={() => setCurrentQuestion(idx)}
              title={`Question ${idx + 1}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizContainer;
