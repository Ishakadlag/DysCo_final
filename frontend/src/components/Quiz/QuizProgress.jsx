import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../hooks/useAuthContext';

const apiURL = import.meta.env.VITE_BACKEND_URL;

const QuizProgress = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        if (!user) return;

        const config = {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        };

        const response = await axios.get(`${apiURL}/api/v1/quiz/user/all`, config);
        if (response.status === 200) {
          setQuizzes(response.data.quizzes || []);
        }
      } catch (error) {
        console.error(error);
        toast.error(error?.response?.data?.message || 'Failed to fetch progress');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  if (loading) return <div>Loading profile progress...</div>;

  if (!quizzes.length) return <div>No quiz progress available yet. Play a quiz to see your stats!</div>;

  const totalAttempted = quizzes.reduce((acc, quiz) => acc + (quiz.attempts || 0), 0);
  const avgScore = Math.round(
    quizzes.reduce((acc, quiz) => acc + (quiz.lastScore || 0), 0) / quizzes.length
  );
  const passedQuizzes = quizzes.filter((quiz) => quiz.bestScore >= quiz.passingScore).length;

  return (
    <div className="quiz-progress-container">
      <h2>Your Game Progress</h2>
      <div className="quiz-progress-overview">
        <p>Total Quizzes Created: <strong>{quizzes.length}</strong></p>
        <p>Total Attempts: <strong>{totalAttempted}</strong></p>
        <p>Average Last Score: <strong>{isNaN(avgScore) ? 0 : avgScore}%</strong></p>
        <p>Quizzes Passed (best): <strong>{passedQuizzes}</strong></p>
      </div>

      <div className="quiz-progress-list">
        {quizzes.map((quiz) => (
          <div key={quiz._id} className="quiz-progress-card">
            <h3>{quiz.title}</h3>
            <p>Type: {quiz.quizType}</p>
            <p>Attempts: {quiz.attempts || 0}</p>
            <p>Last Score: {quiz.lastScore || 'N/A'}%</p>
            <p>Best Score: {quiz.bestScore || 'N/A'}%</p>
            <p>Passing Score: {quiz.passingScore}%</p>
            <p>Status: {quiz.bestScore >= quiz.passingScore ? 'Excellent' : 'Keep Practicing'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizProgress;
