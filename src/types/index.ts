
export interface User {
  id: string;
  name: string;
  email: string;
  isLawyer: boolean;
  createdAt: Date;
}

export interface Lawyer {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  specialization: string;
  experienceYears: number;
  practiceAreas: string[];
  languages: string[];
  officeAddress: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface Rating {
  id: string;
  lawyerId: string;
  userId: string;
  rating: number;
  review: string;
  createdAt: Date;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}
