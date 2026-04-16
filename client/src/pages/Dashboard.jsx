import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './Dashboard.css';

export default function Dashboard() {
  const [assessments, setAssessments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ currentStreak: 0, longestStreak: 0, badges: [] });
  const [moodLogs, setMoodLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Mood form state
  const [moodScore, setMoodScore] = useState(3);
  const [journalEntry, setJournalEntry] = useState('');
  const [submittingMood, setSubmittingMood] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('mm_token');
      const [assRes, taskRes, statsRes, moodRes] = await Promise.all([
        axios.get('http://localhost:5000/api/assessments', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/recommendations/tasks', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/tracking/stats', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { currentStreak: 0, longestStreak: 0, badges: [] } })),
        axios.get('http://localhost:5000/api/tracking/mood', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      setAssessments(assRes.data);
      setTasks(taskRes.data);
      setStats(statsRes.data);
      setMoodLogs(moodRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const generateActionPlan = async () => {
    if (!assessments.length) return;
    setGenerating(true);
    try {
      const token = localStorage.getItem('mm_token');
      const latest = assessments[0];
      await axios.post('http://localhost:5000/api/recommendations/generate', {
        type: latest.assessmentType,
        riskLevel: latest.riskLevel,
        scores: { phq9Score: latest.phq9Score, gad7Score: latest.gad7Score },
        assessmentId: latest._id
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      const taskRes = await axios.get('http://localhost:5000/api/recommendations/tasks', { headers: { Authorization: `Bearer ${token}` } });
      setTasks(taskRes.data);
    } catch (err) {
      console.error('Failed to generate plan', err);
    } finally {
      setGenerating(false);
    }
  };

  const completeTask = async (taskId) => {
    try {
      const token = localStorage.getItem('mm_token');
      await axios.put(`http://localhost:5000/api/recommendations/tasks/${taskId}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, isCompleted: true } : t));
    } catch (err) {
      console.error('Failed to complete task', err);
      alert('Error completing task: ' + (err.response?.data?.message || err.message));
    }
  };

  const submitMoodLog = async (e) => {
    e.preventDefault();
    setSubmittingMood(true);
    try {
      const token = localStorage.getItem('mm_token');
      const res = await axios.post('http://localhost:5000/api/tracking/mood', {
        moodScore,
        journalEntry,
        habits: []
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setMoodLogs([...moodLogs, res.data.log]);
      setStats(res.data.stats);
      setJournalEntry(''); // reset form
      
      if (res.data.newBadgeAwarded) {
        alert(`🎉 You earned a new badge: ${res.data.newBadgeAwarded}`);
      }
    } catch (err) {
      console.error('Failed to submit mood log', err);
      alert('Error saving check-in: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingMood(false);
    }
  };

  const chartData = [...assessments]
    .reverse()
    .filter(a => a.assessmentType === 'Questionnaire') // only plot standard questionnaires for trend consistency
    .map((a, i) => ({
      name: new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      PHQ9: a.phq9Score,
      GAD7: a.gad7Score,
      index: i + 1
    }));

  const latestRisk = assessments.length > 0 ? assessments[0].riskLevel : null;
  const avgPHQ9 = assessments.length > 0
    ? (assessments.reduce((s, a) => s + a.phq9Score, 0) / assessments.length).toFixed(1)
    : '—';
  const avgGAD7 = assessments.length > 0
    ? (assessments.reduce((s, a) => s + a.gad7Score, 0) / assessments.length).toFixed(1)
    : '—';

  if (loading) {
    return (
      <div className="page">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page page">
      <div className="container">
        <div className="dashboard-header animate-fadeInUp">
          <div>
            <h1>Progress Dashboard</h1>
            <p className="dashboard-subtitle">Track your mental health journey over time</p>
          </div>
          <div className="dashboard-actions">
            <div className="streak-badge card">
              <span className="streak-icon">🔥</span>
              <span className="streak-count">{stats.currentStreak} Day Streak</span>
            </div>
            <Link to="/assessment" className="btn btn-primary" id="btn-new-assessment">
              + New Assessment
            </Link>
          </div>
        </div>

        {/* Gamification & Badges */}
        {stats.badges && stats.badges.length > 0 && (
          <div className="badges-section animate-fadeInUp">
            <h3>Your Achievements</h3>
            <div className="badge-list">
              {stats.badges.map((b, i) => (
                <div key={i} className="achievement-badge card" title={`Earned on ${new Date(b.earnedAt).toLocaleDateString()}`}>
                  <span className="achievement-icon">{b.icon}</span>
                  <span className="achievement-name">{b.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dashboard-grid-layout">
          {/* Main Content Column */}
          <div className="dashboard-main-col">
            {/* Summary Cards */}
        <div className="summary-grid animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="summary-card card">
            <div className="summary-icon">📊</div>
            <div className="summary-content">
              <div className="summary-value">{assessments.length}</div>
              <div className="summary-label">Total Assessments</div>
            </div>
          </div>
          <div className="summary-card card">
            <div className="summary-icon">🧠</div>
            <div className="summary-content">
              <div className="summary-value">{avgPHQ9}</div>
              <div className="summary-label">Avg PHQ-9 Score</div>
            </div>
          </div>
          <div className="summary-card card">
            <div className="summary-icon">💚</div>
            <div className="summary-content">
              <div className="summary-value">{avgGAD7}</div>
              <div className="summary-label">Avg GAD-7 Score</div>
            </div>
          </div>
          <div className="summary-card card">
            <div className="summary-icon">🎯</div>
            <div className="summary-content">
              <div className="summary-value">
                {latestRisk ? (
                  <span className={`badge badge-${latestRisk.toLowerCase()}`}>{latestRisk}</span>
                ) : '—'}
              </div>
              <div className="summary-label">Latest Risk Level</div>
            </div>
          </div>
        </div>

        {assessments.length === 0 ? (
          <div className="empty-state card animate-fadeInUp">
            <div className="empty-icon">📋</div>
            <h3>No Assessments Yet</h3>
            <p>Take your first mental health assessment to start tracking your progress.</p>
            <Link to="/assessment" className="btn btn-primary btn-lg">Take Assessment →</Link>
          </div>
        ) : (
          <>
            {/* Daily Action Plan */}
            <div className="action-plan-section animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
              <div className="action-plan-header">
                <h3>Your Active Action Plan</h3>
                {tasks.length === 0 ? (
                  <button className="btn btn-secondary" onClick={generateActionPlan} disabled={generating}>
                    {generating ? 'Generating...' : '✨ Generate Plan'}
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={generateActionPlan} disabled={generating}>
                    🔄 Refresh Plan
                  </button>
                )}
              </div>
              
              <div className="tasks-grid">
                {tasks.length === 0 && !generating && (
                  <div className="no-tasks-state">
                    No active tasks. Generate an action plan based on your latest assessment to get started!
                  </div>
                )}
                
                {tasks.map(task => (
                  <div key={task._id} className={`task-card card ${task.isCompleted ? 'completed' : ''}`}>
                    <div className="task-icon">{task.icon}</div>
                    <div className="task-details">
                      <span className="task-category">{task.category} • {task.duration}</span>
                      <h4>{task.title}</h4>
                      <p>{task.description}</p>
                    </div>
                    {!task.isCompleted ? (
                      <button className="btn btn-primary btn-sm btn-complete" onClick={() => completeTask(task._id)}>
                        Complete
                      </button>
                    ) : (
                      <div className="task-check">✅ Done</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 1 && (
              <div className="chart-card card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                <h3 className="chart-title">Score Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: '#1f2937',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#f9fafb'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="PHQ9"
                      stroke="#818cf8"
                      strokeWidth={2}
                      dot={{ fill: '#818cf8', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="GAD7"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={{ fill: '#a78bfa', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* History Table */}
            <div className="history-section animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <h3>Assessment History</h3>
              <div className="history-table-wrapper">
                <table className="history-table" id="assessment-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>PHQ-9</th>
                      <th>GAD-7</th>
                      <th>Risk Level</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((a) => (
                      <tr key={a._id}>
                        <td>{new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>
                          {a.assessmentType === 'LiveScreening' ? (
                            <span className="badge" style={{ background: '#3b82f6', color: 'white' }}>🎥 Live</span>
                          ) : (
                            <span className="badge" style={{ background: '#6b7280', color: 'white' }}>📋 Form</span>
                          )}
                        </td>
                        <td>{a.phq9Score || 0}/27</td>
                        <td>{a.gad7Score || 0}/21</td>
                        <td><span className={`badge badge-${a.riskLevel.toLowerCase()}`}>{a.riskLevel}</span></td>
                        <td>
                          {a.assessmentType === 'LiveScreening' ? (
                            <Link to={`/screening/results/${a._id}`} className="btn btn-secondary btn-sm">View Details</Link>
                          ) : (
                            <Link to={`/results/${a._id}`} className="btn btn-secondary btn-sm">View Result</Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
          </div>
          
          {/* Sidebar Column: Extra Widgets */}
          <div className="dashboard-side-col animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            
            {/* Quick Mood Check-in */}
            <div className="quick-checkin-card card">
              <div className="checkin-header">
                <h3>Daily Check-in</h3>
              </div>
              
              <form onSubmit={submitMoodLog} className="checkin-form">
                <p className="checkin-label">How are you feeling today?</p>
                <div className="mood-selector">
                  {[
                    { val: 1, emoji: '😩', label: 'Awful' },
                    { val: 2, emoji: '😟', label: 'Bad' },
                    { val: 3, emoji: '😐', label: 'Okay' },
                    { val: 4, emoji: '🙂', label: 'Good' },
                    { val: 5, emoji: '😄', label: 'Great' }
                  ].map(m => (
                    <button
                      type="button"
                      key={m.val}
                      className={`mood-btn ${moodScore === m.val ? 'selected' : ''}`}
                      onClick={() => setMoodScore(m.val)}
                      title={m.label}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
                
                <p className="checkin-label">Daily Micro-Journal</p>
                <textarea
                  className="form-input checkin-textarea"
                  rows="3"
                  placeholder="What's on your mind? (Optional)"
                  value={journalEntry}
                  onChange={(e) => setJournalEntry(e.target.value)}
                />
                
                <button 
                  type="submit" 
                  className="btn btn-secondary btn-full"
                  disabled={submittingMood}
                >
                  {submittingMood ? 'Saving...' : 'Save Check-in 📝'}
                </button>
              </form>
              
              {/* Recent Mood History */}
              {moodLogs.length > 0 && (
                <div className="recent-moods">
                  <h4>Recent Entries</h4>
                  <div className="mood-history-list">
                    {moodLogs.slice(-3).reverse().map(log => (
                      <div key={log._id} className="mood-history-item">
                        <span className="mood-hist-emoji">
                          {log.moodScore === 5 ? '😄' : log.moodScore === 4 ? '🙂' : log.moodScore === 3 ? '😐' : log.moodScore === 2 ? '😟' : '😩'}
                        </span>
                        <div className="mood-hist-details">
                          <span className="mood-hist-date">{new Date(log.createdAt).toLocaleDateString()}</span>
                          {log.journalEntry && <p className="mood-hist-note">"{log.journalEntry}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
