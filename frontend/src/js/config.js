/* API Configuration Constants */
export const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export const ENDPOINTS = {
  // Auth
  REGISTER: `${API_BASE_URL}/auth/register`,
  LOGIN: `${API_BASE_URL}/auth/login`,
  REFRESH: `${API_BASE_URL}/auth/refresh`,
  
  // Profile
  PROFILE: `${API_BASE_URL}/profiles`,
  PROFILE_ME: `${API_BASE_URL}/profiles/me`,
  
  // Nutrition & Meals
  MEALS: `${API_BASE_URL}/nutrition/meals`,
  MEALS_AI: `${API_BASE_URL}/nutrition/meals/ai-parse`,
  MEALS_TODAY: `${API_BASE_URL}/nutrition/meals/today`,
  NUTRITION_SUMMARY: `${API_BASE_URL}/nutrition/summary/today`,
  
  // Health & Workout Analytics
  ANALYTICS_HISTORY: `${API_BASE_URL}/analytics/history`,
  ANALYTICS_DAY_DETAIL: `${API_BASE_URL}/analytics/day-detail`,
  NUTRITION_HISTORY: `${API_BASE_URL}/analytics/history`,
  DAY_DETAIL: `${API_BASE_URL}/analytics/day-detail`,
  
  // Exercises & Workouts
  WORKOUTS: `${API_BASE_URL}/workouts/logs/manual`,
  WORKOUTS_MANUAL: `${API_BASE_URL}/workouts/logs/manual`,
  EXERCISES_CATALOG: `${API_BASE_URL}/workouts/catalog`,
  WORKOUTS_STRUCTURED: `${API_BASE_URL}/workouts/logs/structured`,
  WORKOUTS_TODAY: `${API_BASE_URL}/workouts/logs/today`,
  WORKOUT_SUMMARY: `${API_BASE_URL}/workouts/summary/today`,
  // Backward compatibility aliases
  EXERCISES: `${API_BASE_URL}/workouts/logs/manual`,
  EXERCISES_STRUCTURED: `${API_BASE_URL}/workouts/logs/structured`,
  EXERCISES_TODAY: `${API_BASE_URL}/workouts/logs/today`,
  EXERCISE_SUMMARY: `${API_BASE_URL}/workouts/summary/today`,
};
