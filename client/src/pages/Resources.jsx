import './Resources.css';

const CRISIS_RESOURCES = [
  {
    name: '988 Suicide & Crisis Lifeline',
    contact: 'Call or text 988',
    description: 'Free, 24/7 support for people in distress. Prevention and crisis resources.',
    icon: '📞',
    urgent: true
  },
  {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    description: 'Free, 24/7 crisis counseling via text message.',
    icon: '💬',
    urgent: true
  },
  {
    name: 'NAMI Helpline',
    contact: '1-800-950-NAMI (6264)',
    description: 'National Alliance on Mental Illness — free information, referrals, and support.',
    icon: '🤝',
    urgent: false
  },
  {
    name: 'SAMHSA Helpline',
    contact: '1-800-662-4357',
    description: 'Substance Abuse and Mental Health Services Administration — 24/7, 365 days a year.',
    icon: '🏥',
    urgent: false
  }
];

const SELF_HELP = [
  {
    title: 'Mindfulness & Meditation',
    description: 'Apps like Headspace, Calm, and Insight Timer offer guided meditation and breathing exercises.',
    icon: '🧘'
  },
  {
    title: 'Physical Exercise',
    description: 'Regular physical activity can significantly reduce symptoms of depression and anxiety.',
    icon: '🏃'
  },
  {
    title: 'Sleep Hygiene',
    description: 'Maintain consistent sleep schedules, limit screen time before bed, and create a restful environment.',
    icon: '😴'
  },
  {
    title: 'Journaling',
    description: 'Writing about your thoughts and feelings helps process emotions and identify patterns.',
    icon: '📝'
  },
  {
    title: 'Social Connection',
    description: 'Stay connected with supportive people. Isolation can worsen mental health symptoms.',
    icon: '👥'
  },
  {
    title: 'CBT Techniques',
    description: 'Cognitive Behavioral Therapy workbooks and apps can teach you effective coping strategies.',
    icon: '🧠'
  }
];

const FIND_HELP = [
  {
    title: 'Psychology Today',
    description: 'Search for therapists, psychiatrists, and support groups in your area.',
    url: 'https://www.psychologytoday.com/us/therapists',
    icon: '🔍'
  },
  {
    title: 'BetterHelp',
    description: 'Online counseling platform connecting you with licensed therapists.',
    url: 'https://www.betterhelp.com',
    icon: '💻'
  },
  {
    title: 'Talkspace',
    description: 'Online therapy with licensed providers — text, audio, and video sessions.',
    url: 'https://www.talkspace.com',
    icon: '📱'
  },
  {
    title: 'Open Path Collective',
    description: 'Affordable therapy sessions ($30-$80) with licensed professionals.',
    url: 'https://openpathcollective.org',
    icon: '💚'
  }
];

export default function Resources() {
  return (
    <div className="resources-page page">
      <div className="container">
        <div className="resources-header animate-fadeInUp">
          <h1>Mental Health Resources</h1>
          <p>Essential resources, self-help tools, and professional directories</p>
        </div>

        {/* Crisis Section */}
        <section className="resource-section animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          <h2>🚨 Crisis Resources</h2>
          <p className="section-desc">If you or someone you know is in crisis, reach out immediately.</p>
          <div className="crisis-grid">
            {CRISIS_RESOURCES.map((r, i) => (
              <div key={i} className={`crisis-card card ${r.urgent ? 'urgent' : ''}`}>
                <span className="resource-icon">{r.icon}</span>
                <div className="resource-body">
                  <h4>{r.name}</h4>
                  <div className="crisis-contact">{r.contact}</div>
                  <p>{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Self-Help */}
        <section className="resource-section animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <h2>💡 Self-Help Strategies</h2>
          <p className="section-desc">Evidence-based techniques you can practice on your own.</p>
          <div className="selfhelp-grid">
            {SELF_HELP.map((s, i) => (
              <div key={i} className="selfhelp-card card">
                <span className="resource-icon-lg">{s.icon}</span>
                <h4>{s.title}</h4>
                <p>{s.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Find Professional Help */}
        <section className="resource-section animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <h2>🩺 Find Professional Help</h2>
          <p className="section-desc">Connect with licensed therapists and counselors.</p>
          <div className="findhelp-grid">
            {FIND_HELP.map((f, i) => (
              <a
                key={i}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="findhelp-card card"
              >
                <span className="resource-icon">{f.icon}</span>
                <div className="resource-body">
                  <h4>{f.title} ↗</h4>
                  <p>{f.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="resources-disclaimer card animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          <p>
            ⚠️ <strong>Disclaimer:</strong> MindMentor is an educational tool, not a substitute for professional medical advice.
            Always consult a qualified healthcare professional for clinical diagnosis and treatment.
          </p>
        </div>
      </div>
    </div>
  );
}
