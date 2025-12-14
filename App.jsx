import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css'

function App() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resultCardRef = useRef(null);

  const handleAnalyze = async () => {
    if(!url) return;
    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
      });

      if (!response.ok) throw new Error('Failed to analyze repository');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (resultCardRef.current) {
      const canvas = await html2canvas(resultCardRef.current, {
        backgroundColor: "#18181b", // Matches the card bg color
        scale: 3, // Higher scale for crisp text
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `CodeDarpan-${data.persona.replace(/\s/g, '')}.png`;
      link.click();
    }
  };

  const processChartData = (langDict) => {
    if (!langDict) return [];
    const data = Object.entries(langDict).map(([name, value]) => ({ name, value }));
    return data.sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

  return (
    <div style={styles.container}>
      
      {/* --- HERO SECTION --- */}
      <div style={styles.hero}>
        {/* Badge removed here */}
        <h1 style={styles.header}>
          Code<span style={styles.gradientText}>Darpan</span>
        </h1>
        <p style={styles.subHeader}>
          Reflecting the <span style={{color: '#fff', fontWeight: '600'}}>true value</span> of your code.
        </p>

        {/* --- FLOATING SEARCH BAR --- */}
        <div style={styles.inputWrapper}>
          <input
            type="text"
            placeholder="github.com/username/repository..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={styles.input}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button onClick={handleAnalyze} style={styles.searchBtn} disabled={loading}>
            {loading ? (
              <span style={styles.loader}></span>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            )}
          </button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
      </div>

      {/* --- RESULTS SECTION --- */}
      {data && (
        <div style={styles.gridContainer}>
          
          {/* LEFT: THE CERTIFICATE */}
          <div style={styles.leftColumn}>
            <div ref={resultCardRef} style={styles.certificateCard}>
              <div style={styles.certHeader}>
                <span style={styles.certTitle}>CODEDARPAN REPORT</span>
                <span style={styles.certDate}>{new Date().toLocaleDateString()}</span>
              </div>
              
              <div style={styles.certBody}>
                <div style={styles.scoreContainer}>
                  <div style={styles.scoreRingOuter}>
                    <div style={{...styles.scoreRingInner, borderColor: getScoreColor(data.score)}}>
                      {data.score}
                    </div>
                  </div>
                </div>
                
                <div style={styles.certDetails}>
                  <h2 style={styles.personaTitle}>{data.persona}</h2>
                  <div style={styles.metaGrid}>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>STARS</span>
                      <span style={styles.metaValue}>{data.details.stars}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>FORKS</span>
                      <span style={styles.metaValue}>{data.details.forks}</span>
                    </div>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>MAIN LANG</span>
                      <span style={styles.metaValue}>{data.details.primary_language}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.certFooter}>
                <div style={styles.verifiedBadge}>
                  ✓ AI VERIFIED
                </div>
                <span style={styles.certUrl}>{url.replace('https://github.com/', '')}</span>
              </div>
            </div>

            <button onClick={handleDownload} style={styles.downloadBtn}>
              Download Certificate
            </button>
          </div>

          {/* RIGHT: DASHBOARD */}
          <div style={styles.rightColumn}>
            
            {/* AI SUMMARY PANEL */}
            <div style={styles.glassPanel}>
              <h3 style={styles.panelTitle}>AI Analysis</h3>
              <p style={styles.summaryText}>{data.summary}</p>
            </div>

            <div style={styles.rowSplit}>
              {/* CHART PANEL */}
              <div style={styles.glassPanel}>
                <h3 style={styles.panelTitle}>Code Composition</h3>
                <div style={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={processChartData(data.details.language_breakdown)}
                        cx="50%" cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {processChartData(data.details.language_breakdown).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'}}
                        itemStyle={{color: '#fff', fontSize: '12px'}}
                        formatter={(value) => `${(value / 1024).toFixed(0)} KB`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ROADMAP PANEL */}
              <div style={styles.glassPanel}>
                <h3 style={styles.panelTitle}>Action Plan</h3>
                <ul style={styles.roadmapList}>
                  {data.roadmap.map((tip, idx) => (
                    <li key={idx} style={styles.roadmapItem}>
                      <span style={styles.bullet}>•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

const getScoreColor = (score) => {
  if (score >= 90) return '#4ade80';
  if (score > 60) return '#facc15';
  return '#f87171';
}

/* --- ELEGANT STYLES SYSTEM --- */
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  
  // HERO STYLES
  hero: {
    textAlign: 'center',
    maxWidth: '800px',
    marginBottom: '60px',
    animation: 'fadeIn 1s ease-out',
  },
  // Badge style is no longer needed, but keeping it won't hurt if not used. 
  // You can safely delete this object if you want to clean up.
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    borderRadius: '20px',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    color: '#a78bfa',
    fontSize: '0.75rem',
    fontWeight: '600',
    letterSpacing: '1.5px',
    marginBottom: '20px',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  },
  header: {
    fontSize: '4.5rem',
    fontWeight: '800',
    margin: '0 0 10px 0',
    letterSpacing: '-2px',
    lineHeight: '1.1',
  },
  gradientText: {
    background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subHeader: {
    color: '#94a3b8',
    fontSize: '1.25rem',
    fontWeight: '300',
  },

  // SEARCH INPUT STYLES
  inputWrapper: {
    marginTop: '40px',
    position: 'relative',
    maxWidth: '500px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  input: {
    width: '100%',
    padding: '20px 60px 20px 25px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '1rem',
    outline: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  searchBtn: {
    position: 'absolute',
    right: '10px',
    top: '10px',
    bottom: '10px',
    width: '45px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s',
  },
  error: {
    marginTop: '15px',
    color: '#f87171',
    fontSize: '0.9rem',
    background: 'rgba(248, 113, 113, 0.1)',
    padding: '8px 16px',
    borderRadius: '8px',
    display: 'inline-block',
  },

  // LAYOUT GRID
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '40px',
    width: '100%',
    maxWidth: '1200px',
    animation: 'slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
  },

  // LEFT COLUMN (Certificate)
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'center', 
  },
  certificateCard: {
    width: '100%',
    backgroundColor: '#18181b', // Solid dark for clean screenshot
    borderRadius: '24px',
    padding: '40px',
    border: '1px solid #27272a',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  certHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '40px',
    borderBottom: '1px solid #27272a',
    paddingBottom: '20px',
  },
  certTitle: {
    fontSize: '0.8rem',
    fontWeight: '800',
    color: '#71717a',
    letterSpacing: '2px',
  },
  certDate: {
    fontSize: '0.8rem',
    color: '#52525b',
  },
  certBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: '40px',
  },
  scoreRingOuter: {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    background: '#27272a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '25px',
  },
  scoreRingInner: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: '#18181b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '3.5rem',
    fontWeight: '800',
    color: 'white',
    border: '8px solid', 
  },
  personaTitle: {
    fontSize: '1.8rem',
    fontWeight: '700',
    margin: '0 0 25px 0',
    color: '#ffffff', // Solid white color
    textShadow: '0 4px 10px rgba(0,0,0,0.5)', 
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '20px',
    width: '100%',
    borderTop: '1px solid #27272a',
    paddingTop: '25px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  metaLabel: {
    fontSize: '0.7rem',
    color: '#71717a',
    letterSpacing: '1px',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#e4e4e7',
  },
  certFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  verifiedBadge: {
    fontSize: '0.75rem',
    background: '#2563eb',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '4px',
    fontWeight: '600',
  },
  certUrl: {
    fontSize: '0.8rem',
    color: '#52525b',
  },
  downloadBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: 'none',
    background: '#fff',
    color: '#000',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 0 20px rgba(255,255,255,0.1)',
  },

  // RIGHT COLUMN (Dashboard)
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  glassPanel: {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '24px',
    padding: '30px',
  },
  rowSplit: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  panelTitle: {
    margin: '0 0 20px 0',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#e4e4e7',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  summaryText: {
    lineHeight: '1.8',
    color: '#a1a1aa',
    fontSize: '0.95rem',
  },
  roadmapList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  roadmapItem: {
    display: 'flex',
    gap: '12px',
    marginBottom: '15px',
    fontSize: '0.9rem',
    color: '#d4d4d8',
    alignItems: 'flex-start',
  },
  bullet: {
    color: '#f59e0b',
    fontSize: '1.2rem',
    lineHeight: '1',
  },
  loader: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  }
};

export default App