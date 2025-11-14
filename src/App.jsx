import React, { useState, useEffect } from 'react';
import './App.css';
import ActivityForm from './components/ActivityForm';
import EmissionsChart from './components/EmissionsChart';
import ActivityList from './components/ActivityList';
import SummaryCard from './components/SummaryCard';
import HistoryPage from './components/HistoryPage';
import { getTotalEmissions } from './services/api';

const TIPS = [
  {
    title: 'Swap one meal for a vegetarian option',
    savings: '~2 kg CO₂e',
    icon: '🥗'
  },
  {
    title: 'Walk or bike instead of driving for short trips',
    savings: '~0.5 kg CO₂e per km',
    icon: '🚴'
  },
  {
    title: 'Use public transport instead of personal car',
    savings: '~50% CO₂e reduction',
    icon: '🚌'
  },
  {
    title: 'Switch to LED lighting',
    savings: '~75% energy saved',
    icon: '💡'
  },
  {
    title: 'Reduce meat consumption',
    savings: '~6.61 kg CO₂e per serving',
    icon: '🍖'
  },
  {
    title: 'Use renewable energy sources',
    savings: '~0.8 kg CO₂e per kWh',
    icon: '⚡'
  },
  {
    title: 'Carpool with friends and colleagues',
    savings: '~25% CO₂e reduction per person',
    icon: '👥'
  },
  {
    title: 'Buy local and seasonal produce',
    savings: '~5 kg CO₂e per purchase',
    icon: '🌾'
  },
  {
    title: 'Reduce air travel frequency',
    savings: '~0.255 kg CO₂e per km',
    icon: '✈️'
  },
  {
    title: 'Use energy-efficient appliances',
    savings: '~30-50% energy saved',
    icon: '🔌'
  }
];

function App() {
  const [totalEmissions, setTotalEmissions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  useEffect(() => {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.body.classList.add('dark-mode');
    }
    
    // Load saved tip index from localStorage
    const savedTipIndex = localStorage.getItem('tipIndex');
    if (savedTipIndex !== null) {
      setCurrentTipIndex(parseInt(savedTipIndex));
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    if (newDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const getNextTip = () => {
    const nextIndex = (currentTipIndex + 1) % TIPS.length;
    setCurrentTipIndex(nextIndex);
    localStorage.setItem('tipIndex', nextIndex.toString());
  };

  const currentTip = TIPS[currentTipIndex];

  const fetchData = async () => {
    console.log('fetchData called');
    setLoading(true);
    try {
      // Fetch total emissions with cache busting
      const totalResponse = await getTotalEmissions();
      console.log('getTotalEmissions response:', totalResponse);
      if (totalResponse.success) {
        const newTotal = totalResponse.totalCo2e || 0;
        console.log('Setting totalEmissions to:', newTotal);
        setTotalEmissions(newTotal);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch fresh data whenever refreshKey changes
    console.log('App useEffect: refreshKey changed, calling fetchData');
    fetchData();
  }, [refreshKey]);

  const handleActivityAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleActivityDeleted = () => {
    // Force immediate refresh by incrementing refreshKey
    // This will trigger fetchData in App and fetchActivities in EmissionsChart
    console.log('Activity deleted, triggering refresh...');
    setRefreshKey(prev => {
      const newKey = prev + 1;
      console.log('RefreshKey updated:', prev, '->', newKey);
      return newKey;
    });
  };

  const handleNavClick = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-container">
          <div className="header-left">
            <h1>🌿 GreenLens</h1>
          </div>
          <nav className="header-nav">
            <a 
              href="#dashboard" 
              className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              Dashboard
            </a>
            <a 
              href="#history" 
              className={`nav-link ${currentPage === 'history' ? 'active' : ''}`}
              onClick={() => handleNavClick('history')}
            >
              History
            </a>
          </nav>
          <div className="header-right">
            <span className="user-greeting">Hi, Alex!</span>
            <button 
              className="theme-toggle"
              onClick={toggleDarkMode}
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="App-main">
        {/* Keep all components in DOM but show/hide with CSS to maintain state and update in real-time */}
        <div style={{ display: currentPage === 'dashboard' ? 'block' : 'none' }}>
          <div className="dashboard-container">
            <div className="main-content">
              <SummaryCard totalEmissions={totalEmissions} loading={loading} />

              <div className="content-grid">
                <div className="form-section">
                  <ActivityForm onActivityAdded={handleActivityAdded} />
                </div>

                <div className="chart-section">
                  <EmissionsChart refreshKey={refreshKey} darkMode={darkMode} />
                </div>
              </div>

              <div className="activities-section">
                <ActivityList refreshKey={refreshKey} />
              </div>
            </div>

            <aside className="sidebar">
              <div className="sidebar-card tip-card">
                <div className="tip-icon">{currentTip.icon}</div>
                <h3>Tip: {currentTip.title}</h3>
                <p className="tip-description">save {currentTip.savings}</p>
                <button className="tip-button" onClick={getNextTip}>More Tips</button>
              </div>

              <div className="sidebar-card offset-card">
                <h3>Offset This Month</h3>
                <div className="offset-value">~1260 kg</div>
                <p className="offset-description">Estimated CO₂e for this month</p>
              </div>
            </aside>
          </div>
        </div>

        {/* History Page */}
        <div style={{ display: currentPage === 'history' ? 'block' : 'none' }}>
          <HistoryPage refreshKey={refreshKey} onActivityDeleted={handleActivityDeleted} />
        </div>
      </main>
    </div>
  );
}

export default App;

