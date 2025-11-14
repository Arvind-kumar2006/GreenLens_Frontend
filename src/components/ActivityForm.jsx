import React, { useState } from 'react';
import { createActivity, calculateEmissions } from '../services/api';
import '../styles/ActivityForm.css';

const ActivityForm = ({ onActivityAdded }) => {
  const [activityType, setActivityType] = useState('commute');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewCo2e, setPreviewCo2e] = useState(null);

  // Commute fields
  const [distance, setDistance] = useState('');
  const [transportMode, setTransportMode] = useState('car');

  // Food fields
  const [foodType, setFoodType] = useState('vegetables');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');

  // Electricity fields
  const [energyConsumed, setEnergyConsumed] = useState('');
  const [energyUnit, setEnergyUnit] = useState('kwh');

  // Common fields
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handlePreview = async () => {
    setError('');
    setPreviewCo2e(null);

    const activityData = {
      activityType,
      distance: activityType === 'commute' ? parseFloat(distance) : undefined,
      transportMode: activityType === 'commute' ? transportMode : undefined,
      foodType: activityType === 'food' ? foodType : undefined,
      quantity: activityType === 'food' ? parseFloat(quantity) : undefined,
      unit: activityType === 'food' ? unit : undefined,
      energyConsumed: activityType === 'electricity' ? parseFloat(energyConsumed) : undefined,
      energyUnit: activityType === 'electricity' ? energyUnit : undefined,
    };

    try {
      const result = await calculateEmissions(activityData);
      if (result.success) {
        setPreviewCo2e(result.co2e);
      }
    } catch (err) {
      setError('Failed to calculate preview. Please check your inputs.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const activityData = {
      activityType,
      distance: activityType === 'commute' ? parseFloat(distance) : undefined,
      transportMode: activityType === 'commute' ? transportMode : undefined,
      foodType: activityType === 'food' ? foodType : undefined,
      quantity: activityType === 'food' ? parseFloat(quantity) : undefined,
      unit: activityType === 'food' ? unit : undefined,
      energyConsumed: activityType === 'electricity' ? parseFloat(energyConsumed) : undefined,
      energyUnit: activityType === 'electricity' ? energyUnit : undefined,
      date,
      notes,
    };

    try {
      const result = await createActivity(activityData);
      if (result.success) {
        setSuccess('Activity added successfully!');
        // Reset form
        setDistance('');
        setQuantity('');
        setEnergyConsumed('');
        setNotes('');
        setPreviewCo2e(null);
        onActivityAdded();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="activity-form">
      <h2>Add Activity</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Activity Type *</label>
          <select
            value={activityType}
            onChange={(e) => {
              setActivityType(e.target.value);
              setPreviewCo2e(null);
            }}
            required
          >
            <option value="commute">Commute</option>
            <option value="food">Food</option>
            <option value="electricity">Electricity</option>
          </select>
        </div>

        {activityType === 'commute' && (
          <>
            <div className="form-group">
              <label>Distance (km) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Transport Mode *</label>
              <select
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                required
              >
                <option value="car">Car</option>
                <option value="bus">Bus</option>
                <option value="train">Train</option>
                <option value="plane">Plane</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
                <option value="walking">Walking</option>
              </select>
            </div>
          </>
        )}

        {activityType === 'food' && (
          <>
            <div className="form-group">
              <label>Food Type *</label>
              <select
                value={foodType}
                onChange={(e) => setFoodType(e.target.value)}
                required
              >
                <option value="beef">Beef</option>
                <option value="pork">Pork</option>
                <option value="chicken">Chicken</option>
                <option value="fish">Fish</option>
                <option value="dairy">Dairy</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="grains">Grains</option>
              </select>
            </div>
            <div className="form-group">
              <label>Quantity *</label>
              <div className="quantity-input">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>
          </>
        )}

        {activityType === 'electricity' && (
          <>
            <div className="form-group">
              <label>Energy Consumed *</label>
              <div className="quantity-input">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={energyConsumed}
                  onChange={(e) => setEnergyConsumed(e.target.value)}
                  required
                />
                <select
                  value={energyUnit}
                  onChange={(e) => setEnergyUnit(e.target.value)}
                >
                  <option value="kwh">kWh</option>
                  <option value="mwh">MWh</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            placeholder="Add any additional notes..."
          />
        </div>

        {previewCo2e !== null && (
          <div className="preview-co2e">
            <strong>Estimated CO₂e: {previewCo2e.toFixed(2)} kg</strong>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={handlePreview}
            className="btn btn-secondary"
            disabled={loading}
          >
            Preview Emissions
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Activity'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ActivityForm;

