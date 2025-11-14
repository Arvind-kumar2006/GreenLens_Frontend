import React, { useState, useEffect } from 'react';
import { getActivities, deleteActivity } from '../services/api';
import { format } from 'date-fns';
import '../styles/ActivityList.css';

const ActivityList = ({ refreshKey }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActivities();
  }, [refreshKey, filter]);

  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const params = filter !== 'all' ? { activityType: filter } : {};
      const result = await getActivities({ ...params, limit: 20 });
      if (result.success) {
        setActivities(result.activities);
      }
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this activity?')) {
      return;
    }

    try {
      const result = await deleteActivity(id);
      if (result.success) {
        setActivities(activities.filter(a => a.id !== id));
      }
    } catch (err) {
      setError('Failed to delete activity');
    }
  };

  const getActivityDescription = (activity) => {
    switch (activity.activityType) {
      case 'commute':
        return `${activity.distance} km by ${activity.transportMode}`;
      case 'food':
        return `${activity.quantity} ${activity.unit} of ${activity.foodType}`;
      case 'electricity':
        return `${activity.energyConsumed} ${activity.energyUnit}`;
      default:
        return 'Unknown activity';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'commute':
        return '🚗';
      case 'food':
        return '🍽️';
      case 'electricity':
        return '⚡';
      default:
        return '📊';
    }
  };

  if (loading) {
    return (
      <div className="activity-list">
        <h2>Recent Activities</h2>
        <div className="loading">Loading activities...</div>
      </div>
    );
  }

  return (
    <div className="activity-list">
      <div className="activity-list-header">
        <h2>Recent Activities</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Activities</option>
          <option value="commute">Commute</option>
          <option value="food">Food</option>
          <option value="electricity">Electricity</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      {activities.length === 0 ? (
        <div className="no-activities">
          No activities found. Add your first activity to get started!
        </div>
      ) : (
        <div className="activities-grid">
          {activities.map((activity) => (
            <div key={activity.id} className="activity-card">
              <div className="activity-header">
                <span className="activity-icon">{getActivityIcon(activity.activityType)}</span>
                <span className="activity-type">{activity.activityType.toUpperCase()}</span>
                <button
                  onClick={() => handleDelete(activity.id)}
                  className="btn-delete"
                  title="Delete activity"
                >
                  ×
                </button>
              </div>
              <div className="activity-body">
                <p className="activity-description">{getActivityDescription(activity)}</p>
                <div className="activity-co2e">
                  <strong>{activity.co2e.toFixed(2)} kg CO₂e</strong>
                </div>
                <div className="activity-date">
                  {format(new Date(activity.date), 'MMM dd, yyyy')}
                </div>
                {activity.notes && (
                  <div className="activity-notes">
                    <em>{activity.notes}</em>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityList;

