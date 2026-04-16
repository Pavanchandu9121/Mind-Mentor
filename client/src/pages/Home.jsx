import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="container hero-container">
          
          <div className="hero-header animate-fadeInUp">
            <h1 className="hero-title">
              Nurturing Your Mind,<br/>
              Mentor with Ease.
            </h1>
            <p className="hero-subtitle">
              Elevate your well-being through guided AI screening and create a path to mindful clarity.
            </p>
            
            <div className="hero-stats-row">
              <div className="hero-stat">
                <span className="hero-stat-icon" style={{color: 'var(--accent-primary)'}}>⭐</span>
                <span className="hero-stat-val">4.9</span>
                <span className="hero-stat-label">Average Ratings</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-icon" style={{color: 'var(--accent-primary)'}}>👥</span>
                <span className="hero-stat-val">50K+</span>
                <span className="hero-stat-label">Assessments</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-icon" style={{color: 'var(--accent-primary)'}}>🔒</span>
                <span className="hero-stat-val">100%</span>
                <span className="hero-stat-label">Confidential</span>
              </div>
            </div>

            <div className="hero-actions">
              {user ? (
                <>
                  <Link to="/assessment" className="btn btn-primary btn-lg">Start Assessment</Link>
                  <Link to="/dashboard" className="btn btn-secondary btn-lg">View Dashboard</Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">Try for free</Link>
                </>
              )}
            </div>
          </div>

          <div className="hero-visual-center animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <div className="mockup-frame">
              {/* Left categories floating */}
              <div className="mockup-categories">
                <div className="cat-card stress-bg card">
                  <span className="cat-icon">🪴</span>
                  <span>Stress</span>
                </div>
                <div className="cat-card morning-bg card">
                  <span className="cat-icon">🌅</span>
                  <span>Morning</span>
                </div>
                <div className="cat-card sleep-bg card">
                  <span className="cat-icon">🌙</span>
                  <span>Sleep</span>
                </div>
              </div>

              {/* Inside phone */}
              <div className="mockup-header-top">
                <div className="mh-left">
                  <span className="brand-icon">💮</span> MindMentor
                </div>
                <div className="mh-toggle">
                  ☀️🌙
                </div>
              </div>
              <div className="mockup-body">
                <p>Hey John, welcome back.</p>
                <h4>Your action plan</h4>
                <div className="mockup-cards">
                  <div className="play-card sleep-play card">
                    <span className="time-badge">30 MIN</span>
                    <span className="mc-icon">🌙</span>
                    <span>Sleep</span>
                  </div>
                  <div className="play-card morning-play card">
                    <span className="time-badge">10 MIN</span>
                    <span className="mc-icon">🌅</span>
                    <span>Morning</span>
                  </div>
                </div>
              </div>

              {/* Floating Testimonials / Elements */}
              <div className="float-card fc-right-1 card">
                <span className="fc-quote" style={{color: '#f472b6'}}>❝</span>
                <p>The best screening app out there!</p>
                <small>BETH, IRELAND</small>
              </div>
              <div className="float-card fc-right-2 card">
                <span className="fc-quote" style={{color: '#f472b6'}}>❝</span>
                <p>This app has helped immensely with my mental health.</p>
                <small>JOHN, DENMARK</small>
              </div>
              <div className="float-card fc-right-3 card">
                <span className="fc-quote" style={{color: '#f472b6'}}>❝</span>
                <p>Life-changing app, this has become part of my routine</p>
                <small>JENNIFER, NEW YORK</small>
              </div>
            </div>
          </div>
          
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features-section">
        <div className="container">
          <h2 className="section-title">How Mind<span className="gradient-text">Mentor</span> Works</h2>
          <p className="section-subtitle">A simple 4-step process to understand and improve your mental well-being</p>
          <div className="features-grid">
            {[
              { icon: '📝', title: 'Take Assessment', desc: 'Complete the PHQ-9 depression and GAD-7 anxiety questionnaires in under 10 minutes.', step: '01' },
              { icon: '🤖', title: 'AI Analysis', desc: 'Our machine learning model analyzes your responses to determine your risk level with high accuracy.', step: '02' },
              { icon: '💡', title: 'Get Recommendations', desc: 'Receive personalized guidance based on your results — from self-help to professional resources.', step: '03' },
              { icon: '📈', title: 'Track Progress', desc: 'Monitor your mental health journey over time with visual dashboards and trend analysis.', step: '04' },
            ].map((f, i) => (
              <div key={i} className="feature-card card animate-fadeInUp" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-step">{f.step}</div>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats" id="stats-section">
        <div className="container">
          <div className="stats-grid">
            {[
              { value: '90%', label: 'AI Model Accuracy' },
              { value: 'PHQ-9', label: 'Depression Screening' },
              { value: 'GAD-7', label: 'Anxiety Assessment' },
              { value: '24/7', label: 'Available Anytime' }
            ].map((s, i) => (
              <div key={i} className="stat-item animate-fadeInUp" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="stat-value gradient-text">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="disclaimer-section">
        <div className="container">
          <div className="disclaimer-card card">
            <h3>⚠️ Important Disclaimer</h3>
            <p>
              MindMentor is an educational screening tool and is <strong>not a substitute for professional medical advice</strong>.
              If you are in crisis, please contact the <strong>988 Suicide & Crisis Lifeline</strong> by calling or texting 988,
              or text HOME to <strong>741741</strong> (Crisis Text Line).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
