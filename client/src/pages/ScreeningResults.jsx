import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './ScreeningResults.css';

export default function ScreeningResults() {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(!state?.result);

  useEffect(() => {
    if (state?.result) {
      setResult(state.result);
      setLoading(false);
      return;
    }

    if (id) {
      // Fetch from API
      axios.get(`http://localhost:5000/api/assessments/${id}`)
        .then(res => {
          const a = res.data;
          setResult({
            timestamp: a.createdAt,
            riskLevel: a.riskLevel,
            severity: a.severity,
            confidence: a.confidence,
            fusedScore: a.confidence, // Approximate based on stored confidence
            phq9Score: a.phq9Score,
            gad7Score: a.gad7Score,
            breakdown: a.screeningDetails?.breakdown || {},
            analysis: a.screeningDetails?.analysis || {},
            recommendations: (a.recommendations || []).map(r => typeof r === 'string' ? r : r.description || r)
          });
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          navigate('/dashboard');
        });
    } else {
      navigate('/screening');
    }
  }, [state, id, navigate]);

  if (loading) return <div className="page"><div className="loading-spinner"><div className="spinner"></div></div></div>;
  if (!result) return null;

  const riskColor = {
    Low: 'var(--success)',
    Moderate: 'var(--warning)',
    High: 'var(--danger)'
  }[result.riskLevel] || 'var(--success)';

  const riskBadgeClass = `badge badge-${(result.riskLevel || 'low').toLowerCase()}`;
  const breakdown = result.breakdown || {};
  const analysis = result.analysis || {};

  const SIGNAL_CONFIG = [
    {
      key: 'questionnaire',
      label: 'PHQ/GAD Questionnaire',
      icon: '📋',
      color: '#818cf8',
      detail: breakdown.questionnaire
        ? `PHQ-9: ${breakdown.questionnaire.phq9Score || 0} | GAD-7: ${breakdown.questionnaire.gad7Score || 0}`
        : 'No questionnaire data',
      emotion: breakdown.questionnaire?.riskLevel || '—',
    },
    {
      key: 'facialExpression',
      label: 'Facial Expression',
      icon: '📹',
      color: '#a78bfa',
      detail: analysis.face
        ? `Confidence: ${((analysis.face.confidence || 0) * 100).toFixed(0)}%`
        : 'No face data',
      emotion: breakdown.facialExpression?.dominantEmotion || '—',
    },
    {
      key: 'voiceTone',
      label: 'Voice Tone',
      icon: '🎙️',
      color: '#c084fc',
      detail: analysis.voice
        ? `Confidence: ${((analysis.voice.confidence || 0) * 100).toFixed(0)}%`
        : 'No voice data',
      emotion: breakdown.voiceTone?.emotion || '—',
    },
    {
      key: 'textSentiment',
      label: 'Speech Sentiment',
      icon: '💬',
      color: '#34d399',
      detail: breakdown.textSentiment
        ? `Compound: ${(breakdown.textSentiment.compound || 0).toFixed(2)}`
        : 'No sentiment data',
      emotion: breakdown.textSentiment?.label || '—',
    },
  ];

  return (
    <div className="sr-page page">
      <div className="container">

        {/* Hero Header */}
        <div className="sr-hero animate-fadeInUp">
          <div className="sr-hero-badge">
            <span>🧠</span> AI Live Screening Complete
          </div>
          <h1>Your Screening Results</h1>
          {result.timestamp && (
            <p className="sr-date">
              {new Date(result.timestamp).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}
          {result.processingTimeMs && (
            <span className="sr-processing-time">
              Analyzed in {(result.processingTimeMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Risk Card */}
        <div className="sr-risk-card card animate-fadeInUp" style={{ '--risk-color': riskColor }}>
          <div className="sr-risk-main">
            <div className="sr-risk-gauge">
              <div className="sr-gauge-ring" style={{ '--ring-color': riskColor }}>
                <span className="sr-gauge-label">{result.riskLevel}</span>
                <span className="sr-gauge-sub">Risk Level</span>
              </div>
            </div>
            <div className="sr-risk-stats">
              <div className="sr-stat">
                <span className="sr-stat-label">Severity</span>
                <span className={riskBadgeClass}>{result.severity}</span>
              </div>
              <div className="sr-stat">
                <span className="sr-stat-label">AI Confidence</span>
                <span className="sr-stat-value">{((result.confidence || 0) * 100).toFixed(1)}%</span>
              </div>
              <div className="sr-stat">
                <span className="sr-stat-label">Fused Score</span>
                <span className="sr-stat-value">{result.fusedScore !== undefined ? (result.fusedScore * 100).toFixed(0) : '—'}/100</span>
              </div>
            </div>
          </div>
          <div className="sr-fusion-bar">
            <span className="sr-fusion-label">Multimodal Risk Score</span>
            <div className="sr-fusion-track">
              <div
                className="sr-fusion-fill"
                style={{
                  width: `${(result.fusedScore || 0) * 100}%`,
                  background: riskColor
                }}
              />
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <div className="sr-tabs animate-fadeInUp">
          {['overview', 'breakdown', 'transcription', 'recommendations'].map(tab => (
            <button
              key={tab}
              className={`sr-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              id={`tab-${tab}`}
            >
              {tab === 'overview' && '🔍 Overview'}
              {tab === 'breakdown' && '📊 Signal Breakdown'}
              {tab === 'transcription' && '💬 Transcription'}
              {tab === 'recommendations' && '💡 Recommendations'}
            </button>
          ))}
        </div>

        {/* ─── TAB: OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div className="sr-tab-content animate-fadeIn">
            <div className="sr-signals-grid">
              {SIGNAL_CONFIG.map((signal) => {
                const breakdownItem = breakdown[signal.key] || {};
                const riskScore = breakdownItem.riskScore ?? 0;
                const weight = breakdownItem.weight ?? 0;
                return (
                  <div key={signal.key} className="sr-signal-card card">
                    <div className="sr-signal-header">
                      <span className="sr-signal-icon" style={{ color: signal.color }}>
                        {signal.icon}
                      </span>
                      <span className="sr-signal-label">{signal.label}</span>
                      <span className="sr-signal-weight">{(weight * 100).toFixed(0)}% weight</span>
                    </div>
                    <div className="sr-signal-emotion">{signal.emotion}</div>
                    <p className="sr-signal-detail">{signal.detail}</p>
                    <div className="sr-signal-bar-track">
                      <div
                        className="sr-signal-bar-fill"
                        style={{
                          width: `${riskScore * 100}%`,
                          background: signal.color
                        }}
                      />
                    </div>
                    <span className="sr-signal-risk-pct">
                      Risk indicator: {(riskScore * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* PHQ/GAD scores if available */}
            {(result.phq9Score !== undefined || result.gad7Score !== undefined) && (
              <div className="sr-questionnaire-scores">
                <h3>Questionnaire Scores Used</h3>
                <div className="sr-score-row">
                  <div className="sr-score-item card">
                    <span className="sr-score-icon">🧠</span>
                    <span className="sr-score-name">PHQ-9</span>
                    <span className="sr-score-val">{result.phq9Score ?? 0}<span>/27</span></span>
                    <div className="sr-mini-bar">
                      <div style={{ width: `${((result.phq9Score || 0) / 27) * 100}%`, background: riskColor }} />
                    </div>
                  </div>
                  <div className="sr-score-item card">
                    <span className="sr-score-icon">💚</span>
                    <span className="sr-score-name">GAD-7</span>
                    <span className="sr-score-val">{result.gad7Score ?? 0}<span>/21</span></span>
                    <div className="sr-mini-bar">
                      <div style={{ width: `${((result.gad7Score || 0) / 21) * 100}%`, background: riskColor }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: BREAKDOWN ─── */}
        {activeTab === 'breakdown' && (
          <div className="sr-tab-content animate-fadeIn">
            <div className="sr-breakdown-list">
              {SIGNAL_CONFIG.map((signal) => {
                const item = breakdown[signal.key] || {};
                return (
                  <div key={signal.key} className="sr-breakdown-item card">
                    <div className="sr-breakdown-header">
                      <span style={{ fontSize: '1.5rem' }}>{signal.icon}</span>
                      <div>
                        <h3>{signal.label}</h3>
                        <span className="sr-weight-badge">{(item.weight || 0) * 100}% of final score</span>
                      </div>
                    </div>
                    <div className="sr-breakdown-stats">
                      {Object.entries(item)
                        .filter(([k]) => !['weight'].includes(k))
                        .map(([k, v]) => (
                          <div key={k} className="sr-breakdown-stat">
                            <span className="sr-bs-key">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="sr-bs-val">
                              {typeof v === 'number' ? (k.includes('Score') || k.includes('compound') ? v.toFixed(3) : v) : String(v)}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* Face emotions breakdown */}
                    {signal.key === 'facialExpression' && analysis.face?.emotions && (
                      <div className="sr-emotions-breakdown">
                        <h4>Emotion Distribution</h4>
                        {Object.entries(analysis.face.emotions)
                          .sort(([,a],[,b]) => b - a)
                          .map(([emotion, pct]) => (
                            <div key={emotion} className="sr-emotion-row">
                              <span className="sr-emotion-name">{emotion}</span>
                              <div className="sr-emotion-bar-track">
                                <div className="sr-emotion-bar-fill" style={{ width: `${pct * 100}%` }} />
                              </div>
                              <span className="sr-emotion-pct">{(pct * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Voice emotion scores */}
                    {signal.key === 'voiceTone' && analysis.voice?.scores && (
                      <div className="sr-emotions-breakdown">
                        <h4>Voice Emotion Scores</h4>
                        {Object.entries(analysis.voice.scores)
                          .sort(([,a],[,b]) => b - a)
                          .map(([emotion, score]) => (
                            <div key={emotion} className="sr-emotion-row">
                              <span className="sr-emotion-name">{emotion}</span>
                              <div className="sr-emotion-bar-track">
                                <div className="sr-emotion-bar-fill" style={{ width: `${score * 100}%`, background: '#a78bfa' }} />
                              </div>
                              <span className="sr-emotion-pct">{(score * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB: TRANSCRIPTION ─── */}
        {activeTab === 'transcription' && (
          <div className="sr-tab-content animate-fadeIn">
            <div className="card sr-transcription-card">
              <div className="sr-transcription-header">
                <h3>📝 Speech Transcription</h3>
                {analysis.transcription?.language && (
                  <span className="sr-lang-badge">
                    {analysis.transcription.language.toUpperCase()}
                  </span>
                )}
              </div>

              {analysis.transcription?.text ? (
                <div className="sr-transcription-text">
                  <p>"{analysis.transcription.text}"</p>
                </div>
              ) : (
                <p className="sr-no-transcription">No speech was transcribed. Ensure your microphone was active during the session.</p>
              )}

              {analysis.transcription?.status === 'rejected' && (
                <div className="alert alert-warning">
                  Speech-to-text service was unavailable during analysis.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: RECOMMENDATIONS ─── */}
        {activeTab === 'recommendations' && (
          <div className="sr-tab-content animate-fadeIn">
            <div className="sr-recs-list">
              {(result.recommendations || []).map((rec, i) => (
                <div key={i} className="sr-rec-card card">
                  <span className="sr-rec-num">{i + 1}</span>
                  <p>{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="sr-actions animate-fadeInUp">
          <Link to="/screening" className="btn btn-primary btn-lg" id="btn-redo-screening">
            🎬 Redo Screening
          </Link>
          <Link to="/assessment" className="btn btn-secondary btn-lg" id="btn-go-assessment">
            📋 Take PHQ/GAD Assessment
          </Link>
          <Link to="/dashboard" className="btn btn-secondary btn-lg" id="btn-go-dashboard-sr">
            📊 Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
