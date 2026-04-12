import React, { useState, useRef, useEffect } from 'react';
import { FaUserCircle, FaStar, FaTrophy, FaFire, FaMedal } from "react-icons/fa"
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../hooks/useAuthContext';
import axios from 'axios';
import Sidebar from '../../components/Sidebar/Sidebar';
import Notes from '../../components/Notes/Notes';
import TextToSpeech from '../../components/TextToSpeech/TextToSpeech';
import Summary from '../../components/Summary/Summary';
import SpeechToText from '../../components/SpeechToText/SpeechToText';
import FlashCards from '../../components/FlashCards/FlashCards';
import ListeningGame from '../../components/Games/ListeningGame';
import PronunciationGame from '../../components/Games/PronunciationGame';
import QuizGenerator from '../../components/Quiz/QuizGenerator';
import DyslexiaToggle from '../../components/DyslexiaToggle/DyslexiaToggle';
import "./Dashboard.css";

const Dashboard = () => {
  const [activeComponent, setActiveComponent] = useState('notes');
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const dropdownRef = useRef(null);
  const { dispatch, user } = useAuthContext();
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setShowProfilePanel(!showProfilePanel);
  };

  const handleButtonClick = (componentName) => {
    setActiveComponent(componentName);
    setShowProfilePanel(false);
  }

  const [progressSummary, setProgressSummary] = useState({
    totalGames: 0,
    totalAttempts: 0,
    averageScore: 0,
    bestScore: 0,
  });
  const [gameTypeStats, setGameTypeStats] = useState({});
  const [progressHistory, setProgressHistory] = useState([]);
  const [selectedGameTypeFilter, setSelectedGameTypeFilter] = useState('all');

  const getAchievements = () => {
    const achievements = [];
    
    if (progressSummary.totalGames >= 1) {
      achievements.push({ id: 1, name: 'First Step', icon: '🎬', desc: 'Complete your first game' });
    }
    if (progressSummary.totalGames >= 5) {
      achievements.push({ id: 2, name: 'Learner', icon: '📚', desc: 'Play 5 games' });
    }
    if (progressSummary.totalGames >= 10) {
      achievements.push({ id: 3, name: 'Dedicated', icon: FaTrophy, desc: 'Play 10 games' });
    }
    if (progressSummary.averageScore >= 80) {
      achievements.push({ id: 4, name: 'Star Performer', icon: '⭐', desc: 'Maintain 80% avg score' });
    }
    if (progressSummary.bestScore === 100) {
      achievements.push({ id: 5, name: 'Perfect Score', icon: '🏆', desc: 'Get 100% on a game' });
    }
    if (gameTypeStats.quiz?.totalGames >= 3) {
      achievements.push({ id: 6, name: 'Quiz Master', icon: '🎯', desc: 'Complete 3 quizzes' });
    }
    if (gameTypeStats.listening?.totalGames >= 3) {
      achievements.push({ id: 7, name: 'Good Listener', icon: '🎧', desc: 'Complete 3 listening games' });
    }
    if (gameTypeStats.flashcards?.totalGames >= 5) {
      achievements.push({ id: 8, name: 'Card Expert', icon: '🃏', desc: 'Complete 5 flashcard games' });
    }
    
    return achievements;
  };

  const loadProgress = async () => {
    if (!user) {
      console.warn('loadProgress skipped, no user in context yet');
      return;
    }

    if (!user?.accessToken) {
      console.warn('loadProgress skipped, no access token in user object', user);
      return;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      const config = {
        headers: {
          Authorization: `Bearer ${user.accessToken}`
        }
      };
      const response = await axios.get(`${backendUrl}/api/v1/progress/user/all`, config);
      const progress = response.data.progress || [];

      if (progress.length === 0) {
        setProgressSummary({ totalGames: 0, totalAttempts: 0, averageScore: 0, bestScore: 0 });
        setGameTypeStats({});
        return;
      }

      const normalizedProgress = progress.map((item) => {
        const total = item.total > 0 ? item.total : 1;
        const scorePercent = Math.round((item.score / total) * 100);
        return {
          ...item,
          scorePercent: Math.min(Math.max(scorePercent, 0), 100),
        };
      });

      const totalGames = normalizedProgress.length;
      const totalAttempts = normalizedProgress.reduce((sum, item) => sum + (item.metadata?.attempts || 1), 0);
      const averageScore = totalGames > 0 ? Math.round(normalizedProgress.reduce((sum, item) => sum + item.scorePercent, 0) / totalGames) : 0;
      const bestScore = totalGames > 0 ? Math.max(...normalizedProgress.map((item) => item.scorePercent)) : 0;

      const byType = normalizedProgress.reduce((acc, item) => {
        const type = item.gameType || 'other';
        if (!acc[type]) {
          acc[type] = {
            totalGames: 0,
            totalAttempts: 0,
            totalScore: 0,
            totalPossible: 0,
            bestScore: 0,
            passed: 0
          };
        }

        acc[type].totalGames += 1;
        acc[type].totalAttempts += item.metadata?.attempts || 1;
        acc[type].totalScore += item.scorePercent;
        acc[type].totalPossible += 100;
        acc[type].bestScore = Math.max(acc[type].bestScore, item.scorePercent);
        if (item.passed) acc[type].passed += 1;

        return acc;
      }, {});

      Object.keys(byType).forEach((key) => {
        const data = byType[key];
        byType[key].averageScore = data.totalGames ? Math.round(data.totalScore / data.totalGames) : 0;
      });

      setProgressSummary({ totalGames, totalAttempts, averageScore, bestScore });
      setGameTypeStats(byType);
      setProgressHistory(normalizedProgress.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      console.error('profile stats load error', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        responseData: err.response?.data,
        requestUrl: `${import.meta.env.VITE_BACKEND_URL}/api/v1/progress/user/all`,
      });
      toast.error('Could not load profile progress. Check console for details.');
    }
  };

  const mergeNewProgressRecord = (record) => {
    if (!record) return;

    const total = record.total > 0 ? record.total : 1;
    const normalizedRecord = {
      ...record,
      scorePercent: Math.min(Math.max(Math.round((record.score / total) * 100), 0), 100),
    };

    setProgressHistory((prevHistory) => {
      const updated = [normalizedRecord, ...prevHistory];

      const totalGames = updated.length;
      const totalAttempts = updated.reduce((sum, item) => sum + (item.metadata?.attempts || 1), 0);
      const averageScore = totalGames > 0 ? Math.round(updated.reduce((sum, item) => sum + item.scorePercent, 0) / totalGames) : 0;
      const bestScore = totalGames > 0 ? Math.max(...updated.map((item) => item.scorePercent)) : 0;

      const byType = updated.reduce((acc, item) => {
        const type = item.gameType || 'other';
        if (!acc[type]) {
          acc[type] = {
            totalGames: 0,
            totalAttempts: 0,
            totalScore: 0,
            totalPossible: 0,
            bestScore: 0,
            passed: 0
          };
        }

        acc[type].totalGames += 1;
        acc[type].totalAttempts += item.metadata?.attempts || 1;
        acc[type].totalScore += item.scorePercent;
        acc[type].totalPossible += 100;
        acc[type].bestScore = Math.max(acc[type].bestScore, item.scorePercent);
        if (item.passed) acc[type].passed += 1;

        return acc;
      }, {});

      Object.keys(byType).forEach((key) => {
        const data = byType[key];
        byType[key].averageScore = data.totalGames ? Math.round(data.totalScore / data.totalGames) : 0;
      });

      setProgressSummary({ totalGames, totalAttempts, averageScore, bestScore });
      setGameTypeStats(byType);

      return updated;
    });
  };

  useEffect(() => {
    if (!user) return;

    const listener = (event) => {
      if (event?.detail?.record) {
        mergeNewProgressRecord(event.detail.record);
      } else {
        loadProgress();
      }
    };

    window.addEventListener('progressUpdated', listener);

    loadProgress();

    return () => {
      window.removeEventListener('progressUpdated', listener);
    };
  }, [user, activeComponent]);

  const handleLogout = () => {
    dispatch({ type: "LOGOUT" });
    navigate("/");
  };

  return (
    <div className='dashboard__page__container'>
      <div className='dashboard__header' style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
        <h1>
          👋 Welcome Back,{" "}
          {user && <span>{user.name}</span>}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DyslexiaToggle />
          <button className='logout__btn' onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className='dashboard__page__main'>
        <Sidebar handleButtonClick={handleButtonClick} />

        <div className='main__content__container'>
          {showProfilePanel && (
            <div className='profile-card'>
              <h2>My Profile</h2>
              <div className='profile-card-inner'>
                <div className='profile-main'>
                  <div className='profile-avatar'>
                    <span>{user?.name?.charAt(0)}</span>
                  </div>
                  <div className='profile-details'>
                    <h3>{user?.name || 'Unknown User'}</h3>
                    <p>{user?.email || 'No email'}</p>
                    <p>Status: Online</p>
                  </div>
                </div>
                <div className='profile-progress'>
                  <div className='stat'>
                    <strong>{progressSummary.totalGames}</strong>
                    <span>Games</span>
                  </div>
                  <div className='stat'>
                    <strong>{progressSummary.totalAttempts}</strong>
                    <span>Attempts</span>
                  </div>
                  <div className='stat'>
                    <strong>{progressSummary.averageScore}%</strong>
                    <span>Average</span>
                  </div>
                  <div className='stat'>
                    <strong>{progressSummary.bestScore}%</strong>
                    <span>Best</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeComponent === 'notes' && <Notes />}
          {activeComponent === 'stt' && <SpeechToText />}
          {activeComponent === 'summary' && <Summary />}
          {activeComponent === 'tts' && <TextToSpeech />}
          {activeComponent === 'cards' && <FlashCards />}
          {activeComponent === 'listening' && <ListeningGame />}
          {activeComponent === 'pronunciation' && <PronunciationGame />}
          {activeComponent === 'quiz' && <QuizGenerator />}
          {activeComponent === 'profile' && (
            <div className='profile-page-wrapper'>
              {/* Header Section */}
              <div className='profile-card full-profile-card'>
                <div className='profile-header-top'>
                  <div className='profile-main'>
                    <div className='profile-avatar'>
                      <span>{user?.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className='profile-details'>
                      <h3>{user?.name || 'Unknown User'}</h3>
                      <p className='profile-email'>{user?.email || 'No email'}</p>
                      <p className='profile-status'>🟢 Status: Online</p>
                    </div>
                  </div>
                </div>

                {/* Stats Overview */}
                <div className='stats-overview'>
                  <div className='stat-box'>
                    <div className='stat-icon total'>📊</div>
                    <div className='stat-content'>
                      <h4>{progressSummary.totalGames}</h4>
                      <p>Total Games</p>
                    </div>
                    <div className='progress-bar'>
                      <div className='progress-fill' style={{width: `${Math.min(progressSummary.totalGames * 10, 100)}%`}}></div>
                    </div>
                  </div>

                  <div className='stat-box'>
                    <div className='stat-icon attempts'>🎯</div>
                    <div className='stat-content'>
                      <h4>{progressSummary.totalAttempts}</h4>
                      <p>Total Attempts</p>
                    </div>
                    <div className='progress-bar'>
                      <div className='progress-fill' style={{width: `${Math.min(progressSummary.totalAttempts * 5, 100)}%`}}></div>
                    </div>
                  </div>

                  <div className='stat-box'>
                    <div className='stat-icon avg'>📈</div>
                    <div className='stat-content'>
                      <h4>{progressSummary.averageScore}%</h4>
                      <p>Average Score</p>
                    </div>
                    <div className='progress-bar'>
                      <div className='progress-fill' style={{width: `${progressSummary.averageScore}%`}}></div>
                    </div>
                  </div>

                  <div className='stat-box'>
                    <div className='stat-icon best'>🏆</div>
                    <div className='stat-content'>
                      <h4>{progressSummary.bestScore}%</h4>
                      <p>Best Score</p>
                    </div>
                    <div className='progress-bar'>
                      <div className='progress-fill' style={{width: `${progressSummary.bestScore}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Type Performance */}
              <div className='profile-section'>
                <h3>Performance by Game Type</h3>
                <div className='game-type-grid'>
                  {Object.entries(gameTypeStats).map(([type, stats]) => (
                    <div className='type-card' key={type}>
                      <div className='type-header'>
                        <span className='type-name'>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        <span className={`type-badge ${stats.passed > stats.totalGames / 2 ? 'passing' : 'needs-work'}`}>
                          {stats.passed}/{stats.totalGames}
                        </span>
                      </div>
                      <div className='type-stat'>
                        <p>Games: <strong>{stats.totalGames}</strong></p>
                        <div className='mini-progress'>
                          <div className='mini-fill' style={{width: `${(stats.totalGames / 20) * 100}%`}}></div>
                        </div>
                      </div>
                      <div className='type-stat'>
                        <p>Avg: <strong>{stats.averageScore}%</strong></p>
                        <div className='mini-progress'>
                          <div className='mini-fill' style={{width: `${stats.averageScore}%`}}></div>
                        </div>
                      </div>
                      <div className='type-stat'>
                        <p>Best: <strong>{stats.bestScore}%</strong></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div className='profile-section achievements-section'>
                <h3>🏅 Achievements ({getAchievements().length})</h3>
                <div className='achievements-grid'>
                  {getAchievements().map((ach) => (
                    <div className='achievement-badge' key={ach.id} title={ach.desc}>
                      <span className='ach-icon'>{ach.icon}</span>
                      <span className='ach-name'>{ach.name}</span>
                    </div>
                  ))}
                  {getAchievements().length === 0 && (
                    <p className='no-achievements'>Keep playing to unlock achievements!</p>
                  )}
                </div>
              </div>

              {/* Recent Activity / Score History */}
              <div className='profile-section history-section'>
                <h3>📋 Score History</h3>
                
                <div className='filter-buttons'>
                  <button
                    className={`filter-btn ${selectedGameTypeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedGameTypeFilter('all')}
                  >
                    All
                  </button>
                  {Object.keys(gameTypeStats).map((type) => (
                    <button
                      key={type}
                      className={`filter-btn ${selectedGameTypeFilter === type ? 'active' : ''}`}
                      onClick={() => setSelectedGameTypeFilter(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                <div className='history-table-wrapper'>
                  <table className='history-table'>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Game Type</th>
                        <th>Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressHistory
                        .filter((item) => selectedGameTypeFilter === 'all' || item.gameType === selectedGameTypeFilter)
                        .slice(0, 15)
                        .map((item, idx) => {
                          const scorePercentage = Math.round((item.score / item.total) * 100);
                          const dateStr = new Date(item.createdAt).toLocaleString();
                          return (
                            <tr key={idx} className={item.passed ? 'passed' : 'failed'}>
                              <td>{dateStr}</td>
                              <td>
                                <span className='type-badge-sm'>
                                  {item.gameType ? item.gameType.charAt(0).toUpperCase() + item.gameType.slice(1) : 'Other'}
                                </span>
                              </td>
                              <td>
                                <strong>{item.score}/{item.total}</strong> ({scorePercentage}%)
                              </td>
                              <td>
                                <span className={`status-badge ${item.passed ? 'pass' : 'fail'}`}>
                                  {item.passed ? '✓ Passed' : '✗ Needs Work'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {progressHistory.filter((item) => selectedGameTypeFilter === 'all' || item.gameType === selectedGameTypeFilter).length === 0 && (
                    <p className='no-history'>No games played yet. Start playing games to see your history!</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
