import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/HistoryPage.css';
import { getActivities, getEmissionsByPeriod, deleteActivity } from '../services/api';
import jsPDF from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function HistoryPage({ refreshKey, onActivityDeleted }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCo2: 0,
    dailyAverage: 0,
    highestDay: 0,
    totalEntries: 0,
  });
  const [sevenDayData, setSevenDayData] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');
  const chartRef = useRef(null);

  const generate7DayData = (emissionsData) => {
    // Create an array of the last 7 days starting from today going back
    const today = new Date();
    const sevenDays = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      sevenDays.push({ date: dateStr, co2e: 0 });
    }

    // Map the fetched data to the 7-day array
    emissionsData.forEach(item => {
      const existingDay = sevenDays.find(d => d.date === item.date);
      if (existingDay) {
        existingDay.co2e = item.co2e || 0;
      }
    });

    return sevenDays;
  };

  const calculateStats = useCallback((activitiesList, emissionsData) => {
    // Calculate total from all activities
    const totalCo2 = activitiesList.reduce((sum, act) => sum + (act.co2e || 0), 0);
    const totalEntries = activitiesList.length;
    
    // Calculate daily average from emissions data (always divide by 7 days)
    const dailyTotal = emissionsData.reduce((sum, day) => sum + (day.co2e || 0), 0);
    const dailyAverage = emissionsData.length > 0 ? dailyTotal / 7 : 0;
    
    // Calculate highest day
    const highestDay = emissionsData.length > 0
      ? Math.max(...emissionsData.map(day => day.co2e || 0))
      : 0;

    setStats({
      totalCo2: parseFloat(totalCo2.toFixed(2)),
      dailyAverage: parseFloat(dailyAverage.toFixed(2)),
      highestDay: parseFloat(highestDay.toFixed(2)),
      totalEntries,
    });
  }, []);

  const fetchHistoryData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all activities
      const activitiesResponse = await getActivities({ limit: 1000 });
      let activitiesData = [];
      
      if (activitiesResponse.success) {
        // The API returns activities, not data
        activitiesData = activitiesResponse.activities || activitiesResponse.data || [];
      }

      setActivities(activitiesData);

      // Fetch 7-day emissions data
      const emissionsResponse = await getEmissionsByPeriod('day', 7);
      let emissionsData = [];
      
      if (emissionsResponse.success && emissionsResponse.data) {
        emissionsData = Array.isArray(emissionsResponse.data) ? emissionsResponse.data : [];
      } else if (Array.isArray(emissionsResponse)) {
        emissionsData = emissionsResponse;
      }

      const processedData = generate7DayData(emissionsData);
      setSevenDayData(processedData);
      calculateStats(activitiesData, processedData);
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    fetchHistoryData();
  }, [refreshKey, fetchHistoryData]);

  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      const result = await deleteActivity(id);
      if (result.success) {
        console.log('Activity deleted successfully, id:', id);
        // Remove activity from state
        const updatedActivities = activities.filter(a => a.id !== id);
        setActivities(updatedActivities);
        
        // Recalculate stats with updated data
        const today = new Date();
        const sevenDays = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayEmissions = updatedActivities
            .filter(a => a.date === dateStr)
            .reduce((sum, a) => sum + (a.co2e || 0), 0);
          sevenDays.push({ date: dateStr, co2e: dayEmissions });
        }
        
        setSevenDayData(sevenDays);
        calculateStats(updatedActivities, sevenDays);
        
        // Trigger dashboard refresh to update pie chart
        if (onActivityDeleted) {
          console.log('Calling onActivityDeleted callback');
          onActivityDeleted();
        }
      }
    } catch (err) {
      console.error('Failed to delete activity:', err);
      alert('Failed to delete activity. Please try again.');
    }
  };

  const getFilteredActivities = () => {
    if (filterCategory === 'all') {
      return activities;
    }
    return activities.filter(act => 
      act.activityType?.toLowerCase() === filterCategory.toLowerCase()
    );
  };

  const exportToCSV = () => {
    const filteredActivities = getFilteredActivities();
    
    const getActivityDetails = (activity) => {
      if (activity.activityType === 'commute') {
        return {
          type: activity.transportMode,
          value: activity.distance,
          unit: 'km'
        };
      } else if (activity.activityType === 'food') {
        return {
          type: activity.foodType,
          value: activity.quantity,
          unit: activity.unit
        };
      } else if (activity.activityType === 'electricity') {
        return {
          type: 'Electricity',
          value: activity.energyConsumed,
          unit: activity.energyUnit
        };
      }
      return { type: '', value: '', unit: '' };
    };

    const csvContent = [
      ['Date', 'Category', 'Type', 'Value', 'Unit', 'CO2e (kg)', 'Notes'],
      ...filteredActivities.map(act => {
        const details = getActivityDetails(act);
        return [
          new Date(act.createdAt).toLocaleDateString(),
          act.activityType || '',
          details.type || '',
          details.value || '',
          details.unit || '',
          (act.co2e || 0).toFixed(2),
          act.notes || '',
        ];
      }),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    link.download = `GreenLens_History_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const filteredActivities = getFilteredActivities();
    
    const getActivityDetails = (activity) => {
      if (activity.activityType === 'commute') {
        return {
          type: activity.transportMode,
          value: activity.distance,
          unit: 'km'
        };
      } else if (activity.activityType === 'food') {
        return {
          type: activity.foodType,
          value: activity.quantity,
          unit: activity.unit
        };
      } else if (activity.activityType === 'electricity') {
        return {
          type: 'Electricity',
          value: activity.energyConsumed,
          unit: activity.energyUnit
        };
      }
      return { type: '', value: '', unit: '' };
    };

    const doc = new jsPDF();
    // pageWidth not used directly; keep only height when needed
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(29, 209, 161);
    doc.text('GreenLens - Carbon History', 15, 20);

    // Stats
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 30);

    // Summary stats
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Total CO₂e: ${stats.totalCo2} kg`, 15, 45);
    doc.text(`Daily Average: ${stats.dailyAverage} kg/day`, 15, 52);
    doc.text(`Highest Day: ${stats.highestDay} kg`, 15, 59);
    doc.text(`Total Entries: ${stats.totalEntries}`, 15, 66);

    // Table
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    let yPosition = 80;
    const rowHeight = 8;
    const headers = ['Date', 'Category', 'Type', 'Value', 'Unit', 'CO₂e (kg)'];
    const columnWidths = [25, 20, 25, 15, 15, 20];
    const startX = 10;

    // Header row
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(29, 209, 161);
    let currentX = startX;
    headers.forEach((header, i) => {
      doc.rect(currentX, yPosition - 6, columnWidths[i], rowHeight, 'F');
      doc.text(header, currentX + 2, yPosition);
      currentX += columnWidths[i];
    });

    yPosition += rowHeight + 2;

    // Data rows
    doc.setFont(undefined, 'normal');
    doc.setTextColor(50, 50, 50);
    filteredActivities.forEach((act, index) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 15;
      }

      const details = getActivityDetails(act);
      const rowData = [
        new Date(act.createdAt).toLocaleDateString(),
        act.activityType || '',
        details.type || '',
        details.value || '',
        details.unit || '',
        (act.co2e || 0).toFixed(2),
      ];

      currentX = startX;
      rowData.forEach((data, i) => {
        if (index % 2 === 0) {
          doc.setFillColor(240, 240, 240);
          doc.rect(currentX, yPosition - 6, columnWidths[i], rowHeight, 'F');
        }
        doc.text(String(data), currentX + 2, yPosition);
        currentX += columnWidths[i];
      });

      yPosition += rowHeight;
    });

    doc.save(`GreenLens_History_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredActivities = getFilteredActivities();

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header">
        <h1>7-Day History</h1>
        <p>Track your carbon emissions from the past week and identify patterns</p>
      </div>

      {/* Export Buttons */}
      <div className="export-buttons">
        <button className="btn btn-export btn-pdf" onClick={exportToPDF}>
          📥 Export as PDF
        </button>
        <button className="btn btn-export btn-csv" onClick={exportToCSV}>
          📊 Export as CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-label">Total CO₂e</div>
          <div className="stat-value">{stats.totalCo2}</div>
          <div className="stat-unit">kg</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-label">Daily Average</div>
          <div className="stat-value">{stats.dailyAverage}</div>
          <div className="stat-unit">kg/day</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⬆️</div>
          <div className="stat-label">Highest Day</div>
          <div className="stat-value">{stats.highestDay}</div>
          <div className="stat-unit">kg</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-label">Entries</div>
          <div className="stat-value">{stats.totalEntries}</div>
          <div className="stat-unit">tracked</div>
        </div>
      </div>

      {/* 7-Day Trend Chart */}
      <div className="chart-section">
        <h2>7-Day Trend</h2>
        <p className="chart-description">Your daily carbon emissions over the past week</p>
        {sevenDayData.length > 0 ? (
          <div className="bar-chart-container">
            <Bar
              ref={chartRef}
              data={{
                labels: sevenDayData.map(day => {
                  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  return daysOfWeek[new Date(day.date).getDay()];
                }),
                datasets: [
                  {
                    label: 'CO₂ Emissions (kg)',
                    data: sevenDayData.map(d => d.co2e || 0),
                    backgroundColor: 'rgba(0, 212, 255, 0.7)',
                    borderColor: 'rgba(0, 212, 255, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(0, 212, 255, 0.9)',
                    hoverBorderColor: 'rgba(0, 212, 255, 1)',
                    hoverBorderWidth: 3,
                    borderSkipped: false,
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      color: document.body.classList.contains('dark-mode') ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.8)',
                      font: { weight: '600', size: 13 },
                      padding: 15,
                      usePointStyle: true,
                    }
                  },
                  tooltip: {
                    backgroundColor: document.body.classList.contains('dark-mode') ? 'rgba(30, 30, 30, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(0, 212, 255, 0.5)',
                    borderWidth: 1,
                    padding: 10,
                    titleFont: { weight: 'bold', size: 13 },
                    bodyFont: { size: 12 },
                    callbacks: {
                      label: function(context) {
                        return context.parsed.y.toFixed(2) + ' kg CO₂e';
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'kg CO₂e'
                    },
                    ticks: {
                      color: document.body.classList.contains('dark-mode') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                      font: { size: 11 },
                      callback: function(value) {
                        return value.toFixed(1);
                      }
                    },
                    grid: {
                      color: document.body.classList.contains('dark-mode') ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      borderColor: document.body.classList.contains('dark-mode') ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    }
                  },
                  x: {
                    ticks: {
                      color: document.body.classList.contains('dark-mode') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                      font: { size: 11, weight: '600' }
                    },
                    grid: {
                      color: 'transparent',
                      borderColor: document.body.classList.contains('dark-mode') ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    }
                  }
                }
              }}
            />
          </div>
        ) : (
          <div className="no-data">No data available</div>
        )}
      </div>

      {/* Category Breakdown Section */}
      <div className="breakdown-section">
        <div className="breakdown-header">
          <h2>Category Breakdown</h2>
          <div className="filter-container">
            <label htmlFor="category-filter">Filter</label>
            <select
              id="category-filter"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="category-filter"
            >
              <option value="all">All Categories</option>
              <option value="commute">Commute</option>
              <option value="electricity">Electricity</option>
              <option value="food">Food</option>
            </select>
          </div>
        </div>

        {/* Category Stats */}
        <div className="category-stats">
          {filterCategory === 'all' ? (
            ['commute', 'electricity', 'food'].map((category) => {
              const categoryActivities = activities.filter(
                (act) => act.activityType?.toLowerCase() === category.toLowerCase()
              );
              const categoryTotal = categoryActivities.reduce((sum, act) => sum + (act.co2e || 0), 0);
              const categoryPercent = stats.totalCo2 > 0 
                ? ((categoryTotal / stats.totalCo2) * 100).toFixed(1)
                : 0;

              const icons = {
                commute: '🚗',
                electricity: '⚡',
                food: '🍽️',
              };

              return (
                <div key={category} className="category-item">
                  <span className="category-icon">{icons[category]}</span>
                  <span className="category-name">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                  <span className="category-value">{categoryTotal.toFixed(2)} kg ({categoryPercent}%)</span>
                </div>
              );
            })
          ) : (
            (() => {
              const categoryActivities = activities.filter(
                (act) => act.activityType?.toLowerCase() === filterCategory.toLowerCase()
              );
              const categoryTotal = categoryActivities.reduce((sum, act) => sum + (act.co2e || 0), 0);
              const categoryPercent = stats.totalCo2 > 0 
                ? ((categoryTotal / stats.totalCo2) * 100).toFixed(1)
                : 0;

              const icons = {
                commute: '🚗',
                electricity: '⚡',
                food: '🍽️',
              };

              return (
                <div className="category-item category-item-full">
                  <span className="category-icon">{icons[filterCategory]}</span>
                  <span className="category-name">{filterCategory.charAt(0).toUpperCase() + filterCategory.slice(1)}</span>
                  <span className="category-value">{categoryTotal.toFixed(2)} kg ({categoryPercent}%)</span>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Detailed Entries Table */}
      <div className="detailed-section">
        <h2>Detailed Entries</h2>
        {loading ? (
          <div className="loading">Loading entries...</div>
        ) : filteredActivities.length > 0 ? (
          <div className="table-wrapper">
            <table className="entries-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>CO₂e (kg)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => {
                  const getActivityDetails = () => {
                    if (activity.activityType === 'commute') {
                      return {
                        type: activity.transportMode,
                        value: activity.distance,
                        unit: 'km'
                      };
                    } else if (activity.activityType === 'food') {
                      return {
                        type: activity.foodType,
                        value: activity.quantity,
                        unit: activity.unit
                      };
                    } else if (activity.activityType === 'electricity') {
                      return {
                        type: 'Electricity',
                        value: activity.energyConsumed,
                        unit: activity.energyUnit
                      };
                    }
                    return { type: '', value: '', unit: '' };
                  };

                  const details = getActivityDetails();

                  return (
                    <tr key={activity.id}>
                      <td>{new Date(activity.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className="category-badge">{activity.activityType}</span>
                      </td>
                      <td>{details.type}</td>
                      <td>{details.value}</td>
                      <td>{details.unit}</td>
                      <td className="co2e-value">{(activity.co2e || 0).toFixed(2)}</td>
                      <td>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDeleteActivity(activity.id)}
                          title="Delete this activity"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-activities">
            <p>No activities recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
