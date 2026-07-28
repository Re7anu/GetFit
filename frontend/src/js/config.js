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
  
  // Exercises & Workouts
  EXERCISES: `${API_BASE_URL}/exercises/logs`,
  EXERCISES_AI: `${API_BASE_URL}/exercises/logs/ai-parse`,
  EXERCISES_CATALOG: `${API_BASE_URL}/exercises/catalog`,
  EXERCISES_STRUCTURED: `${API_BASE_URL}/exercises/logs/structured`,
  EXERCISES_TODAY: `${API_BASE_URL}/exercises/logs/today`,
  EXERCISE_SUMMARY: `${API_BASE_URL}/exercises/summary/today`,
};
