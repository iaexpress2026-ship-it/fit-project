export interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface Workout {
  id: number;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  body_part: string;
}

export interface Routine {
  id: number;
  user_id: number;
  workout_id: number;
  day_of_week: string;
  title?: string;
  category?: string;
  duration?: number;
}

export interface Recipe {
  id: number;
  title: string;
  ingredients: string;
  preparation: string;
  calories: string;
  benefits: string;
  category: string;
}
