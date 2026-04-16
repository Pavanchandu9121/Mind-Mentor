import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './Results.css';

export default function Results() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/assessments/${id}`);
      setAssessment(res.data);
    } catch (err) {
      setError('Failed to load assessment results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="loading-spinner"><div className="spinner"></div></div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="page">
        <div className="container">
          <div className="alert alert-error">{error || 'Assessment not found'}</div>
          <Link to="/dashboard" className="btn btn-secondary">Go to Dashboard</Link>
        </div>
      </div>
    );
  }

  const riskColor = {
    Low: 'var(--success)',
    Moderate: 'var(--warning)',
    High: 'var(--danger)'
  }[assessment.riskLevel];

  const riskBadgeClass = `badge badge-${assessment.riskLevel.toLowerCase()}`;

  const phq9Max = 27;
  const gad7Max = 21;
  const phq9Pct = (assessment.phq9Score / phq9Max) * 100;
  const gad7Pct = (assessment.gad7Score / gad7Max) * 100;

  return (
    <div className="results-page page">
      <div className="container">
        {/* Overview */}
        <div className="results-header animate-fadeInUp">
          <h1>Assessment Results</h1>
          <p className="results-date">
            {new Date(assessment.createdAt).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>

        {/* Risk Level Card */}
        <div className="risk-card card animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <div className="risk-main">
            <div className="risk-gauge" style={{ '--risk-color': riskColor }}>
              <div className="risk-gauge-circle">
                <span className="risk-gauge-label">{assessment.riskLevel}</span>
                <span className="risk-gauge-sub">Risk Level</span>
              </div>
            </div>
            <div className="risk-details">
              <div className="risk-detail-item">
                <span className="detail-label">Severity</span>
                <span className={riskBadgeClass}>{assessment.severity}</span>
              </div>
              <div className="risk-detail-item">
                <span className="detail-label">AI Confidence</span>
                <span className="detail-value">{(assessment.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="scores-grid animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="score-card card">
            <div className="score-header">
              <span className="score-icon">🧠</span>
              <h3>PHQ-9 Score</h3>
            </div>
            <div className="score-value">{assessment.phq9Score}<span className="score-max">/ {phq9Max}</span></div>
            <div className="score-bar">
              <div className="score-bar-fill" style={{ width: `${phq9Pct}%`, background: riskColor }}></div>
            </div>
            <p className="score-desc">Depression Severity</p>
          </div>

          <div className="score-card card">
            <div className="score-header">
              <span className="score-icon">💚</span>
              <h3>GAD-7 Score</h3>
            </div>
            <div className="score-value">{assessment.gad7Score}<span className="score-max">/ {gad7Max}</span></div>
            <div className="score-bar">
              <div className="score-bar-fill" style={{ width: `${gad7Pct}%`, background: riskColor }}></div>
            </div>
            <p className="score-desc">Anxiety Severity</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="recommendations-section animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <h2>Personalized Recommendations</h2>
          <div className="recs-grid">
            {assessment.recommendations?.map((rec, i) => (
              <div key={i} className="rec-card card" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
                <span className="rec-icon">{rec.icon}</span>
                <div className="rec-content">
                  <h4>{rec.title}</h4>
                  <p>{rec.description}</p>
                  <span className={`badge badge-${rec.type === 'professional' ? 'high' : rec.type === 'counseling' ? 'moderate' : 'low'}`}>
                    {rec.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="results-actions animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          <Link to="/assessment" className="btn btn-primary btn-lg" id="btn-retake">
            Retake Assessment
          </Link>
          <Link to="/dashboard" className="btn btn-secondary btn-lg" id="btn-go-dashboard">
            View Dashboard
          </Link>
          <Link to="/resources" className="btn btn-secondary btn-lg" id="btn-go-resources">
            Browse Resources
          </Link>
        </div>
      </div>
    </div>
  );
}
