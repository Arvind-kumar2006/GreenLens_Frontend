/**
 * Calculate emissions breakdown by category from activities
 * @param {Array} activities - Array of activity objects
 * @returns {Object} Breakdown by category
 */
export const getCategoryBreakdown = (activities = []) => {
  const breakdown = {
    commute: 0,
    electricity: 0,
    food: 0
  };

  activities.forEach(activity => {
    if (activity && activity.activityType && activity.co2e) {
      if (breakdown.hasOwnProperty(activity.activityType)) {
        breakdown[activity.activityType] += activity.co2e;
      }
    }
  });

  return breakdown;
};
