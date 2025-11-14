import React from 'react';
import '../styles/SummaryCard.css';

const SummaryCard = ({ totalEmissions, loading }) => {
  console.log('SummaryCard rendered with totalEmissions:', totalEmissions, 'loading:', loading);
  // Convert kg to tons for better readability
  const tons = (totalEmissions / 1000).toFixed(3);
  const kg = totalEmissions.toFixed(2);

  // Calculate equivalent (rough estimates)
  const treesNeeded = Math.ceil(totalEmissions / 21.77); // Average tree absorbs ~21.77 kg CO2 per year
  const carMiles = (totalEmissions / 0.411).toFixed(0); // Average car emits ~0.411 kg CO2 per mile

  return (
    <div className="summary-card">
      <div className="summary-content">
        <div className="summary-main">
          <h2>Total Carbon Footprint</h2>
          {loading ? (
            <div className="loading">Calculating...</div>
          ) : (
            <div className="emission-display">
              <div className="emission-value">
                {kg} <span className="unit">kg CO₂e</span>
              </div>
              <div className="emission-alternative">
                ({tons} tons)
              </div>
            </div>
          )}
        </div>
        {!loading && totalEmissions > 0 && (
          <div className="summary-equivalents">
            <div className="equivalent-item">
              <span className="equivalent-icon">🌳</span>
              <div>
                <div className="equivalent-value">{treesNeeded}</div>
                <div className="equivalent-label">trees needed/year</div>
              </div>
            </div>
            <div className="equivalent-item">
              <span className="equivalent-icon">🚗</span>
              <div>
                <div className="equivalent-value">{carMiles}</div>
                <div className="equivalent-label">car miles</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;

