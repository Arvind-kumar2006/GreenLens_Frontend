import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { getActivities } from '../services/api';
import { getCategoryBreakdown } from '../utils';
import '../styles/EmissionsChart.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const EmissionsChart = ({ refreshKey, darkMode: darkModeFromProps }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(darkModeFromProps || document.body.classList.contains('dark-mode'));

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getActivities({ limit: 100 });
      if (result.success) {
        setActivities(result.activities || []);
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Immediately fetch activities when refreshKey changes
    console.log('EmissionsChart: refreshKey changed to', refreshKey, 'fetching fresh data...');
    fetchActivities();
  }, [refreshKey, fetchActivities]);

  useEffect(() => {
    // Update dark mode from props if provided
    if (darkModeFromProps !== undefined) {
      setDarkMode(darkModeFromProps);
    }
  }, [darkModeFromProps]);

  useEffect(() => {
    // Watch for dark mode changes if not controlled by props
    if (darkModeFromProps === undefined) {
      const observer = new MutationObserver(() => {
        setDarkMode(document.body.classList.contains('dark-mode'));
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, [darkModeFromProps]);

  if (loading) {
    return (
      <div className="chart-container">
        <h2>Category Breakdown</h2>
        <div className="loading">Loading chart data...</div>
      </div>
    );
  }

  const breakdown = getCategoryBreakdown(activities);
  const total = breakdown.commute + breakdown.electricity + breakdown.food;

  if (total === 0) {
    return (
      <div className="chart-container">
        <h2>Category Breakdown</h2>
        <div className="no-data">No data available. Add some activities to see your emissions!</div>
      </div>
    );
  }

  const chartData = {
    labels: ['Commute', 'Electricity', 'Food'],
    datasets: [
      {
        data: [breakdown.commute, breakdown.electricity, breakdown.food],
        backgroundColor: darkMode ? [
          '#00a8cc',
          '#6ee7b7',
          '#fbbf24'
        ] : [
          '#00d4ff',
          '#86efac',
          '#fde68a'
        ],
        borderColor: darkMode ? [
          '#0891b2',
          '#10b981',
          '#f59e0b'
        ] : [
          '#00d4ff',
          '#86efac',
          '#fde68a'
        ],
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 13,
            weight: '600'
          },
          color: darkMode ? '#e5e7eb' : '#111827',
          boxWidth: 12,
          boxHeight: 12
        }
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: darkMode ? '#fff' : '#000',
        bodyColor: darkMode ? '#fff' : '#000',
        borderColor: darkMode ? '#00a8cc' : '#1dd1a1',
        borderWidth: 1,
        titleFont: {
          weight: '600',
          size: 13
        },
        bodyFont: {
          size: 12,
          weight: '500'
        },
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value.toFixed(2)} kg (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <h2>Category Breakdown</h2>
      {error && <div className="error">{error}</div>}
      <div className="pie-container">
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default EmissionsChart;

