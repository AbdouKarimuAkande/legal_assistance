
export interface LawyerProfile {
  id?: string;
  userId: string;
  licenseNumber: string;
  specialization: string;
  experienceYears: number;
  practiceAreas: string[];
  languages: string[];
  officeAddress: string;
  phone: string;
  description: string;
  profileImage?: string;
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LawyerRating {
  id?: string;
  lawyerId: string;
  userId: string;
  rating: number;
  review: string;
  createdAt?: Date;
}

export class LawyerService {
  private apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://0.0.0.0:3000/api';

  async createLawyerProfile(profileData: FormData): Promise<LawyerProfile> {
    try {
      console.log('Creating lawyer profile...');
      
      // Mock API response - replace with actual API call
      const mockProfile: LawyerProfile = {
        id: 'lawyer-' + Date.now(),
        userId: profileData.get('userId') as string,
        licenseNumber: profileData.get('licenseNumber') as string,
        specialization: profileData.get('specialization') as string,
        experienceYears: parseInt(profileData.get('experienceYears') as string),
        practiceAreas: JSON.parse(profileData.get('practiceAreas') as string),
        languages: JSON.parse(profileData.get('languages') as string),
        officeAddress: profileData.get('officeAddress') as string,
        phone: profileData.get('phone') as string,
        description: profileData.get('description') as string,
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return mockProfile;
    } catch (error) {
      console.error('Error creating lawyer profile:', error);
      throw new Error('Failed to create lawyer profile');
    }
  }

  async getLawyers(filters?: {
    specialization?: string;
    language?: string;
    minExperience?: number;
    search?: string;
  }): Promise<LawyerProfile[]> {
    try {
      console.log('Fetching lawyers with filters:', filters);
      
      // Mock data - replace with actual API call
      const mockLawyers: LawyerProfile[] = [
        {
          id: '1',
          userId: 'user1',
          licenseNumber: 'BAR001234',
          specialization: 'Corporate Law',
          experienceYears: 15,
          practiceAreas: ['Corporate Law', 'Tax Law', 'Real Estate'],
          languages: ['French', 'English', 'Duala'],
          officeAddress: 'Rue de la Réunification, Douala, Cameroon',
          phone: '+237 691 234 567',
          description: 'Experienced corporate lawyer with 15+ years helping businesses navigate legal complexities.',
          rating: 4.8,
          reviewCount: 45,
          isVerified: true
        },
        {
          id: '2',
          userId: 'user2',
          licenseNumber: 'BAR005678',
          specialization: 'Criminal Law',
          experienceYears: 12,
          practiceAreas: ['Criminal Law', 'Civil Rights'],
          languages: ['English', 'French', 'Ewondo'],
          officeAddress: 'Avenue Kennedy, Yaoundé, Cameroon',
          phone: '+237 677 345 678',
          description: 'Dedicated criminal defense attorney committed to protecting your rights.',
          rating: 4.6,
          reviewCount: 32,
          isVerified: true
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return mockLawyers;
    } catch (error) {
      console.error('Error fetching lawyers:', error);
      throw new Error('Failed to fetch lawyers');
    }
  }

  async getLawyerById(lawyerId: string): Promise<LawyerProfile | null> {
    try {
      const lawyers = await this.getLawyers();
      return lawyers.find(lawyer => lawyer.id === lawyerId) || null;
    } catch (error) {
      console.error('Error fetching lawyer:', error);
      throw new Error('Failed to fetch lawyer details');
    }
  }

  async rateLawyer(rating: LawyerRating): Promise<LawyerRating> {
    try {
      console.log('Submitting lawyer rating:', rating);
      
      // Mock API response
      const mockRating: LawyerRating = {
        ...rating,
        id: 'rating-' + Date.now(),
        createdAt: new Date()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return mockRating;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw new Error('Failed to submit rating');
    }
  }

  async getLawyerRatings(lawyerId: string): Promise<LawyerRating[]> {
    try {
      console.log('Fetching ratings for lawyer:', lawyerId);
      
      // Mock ratings data
      const mockRatings: LawyerRating[] = [
        {
          id: '1',
          lawyerId,
          userId: 'user1',
          rating: 5,
          review: 'Excellent lawyer, very professional and knowledgeable.',
          createdAt: new Date('2024-01-15')
        },
        {
          id: '2',
          lawyerId,
          userId: 'user2',
          rating: 4,
          review: 'Good service, helped me with my case efficiently.',
          createdAt: new Date('2024-01-10')
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return mockRatings;
    } catch (error) {
      console.error('Error fetching ratings:', error);
      throw new Error('Failed to fetch ratings');
    }
  }

  async updateLawyerProfile(lawyerId: string, updates: Partial<LawyerProfile>): Promise<LawyerProfile> {
    try {
      console.log('Updating lawyer profile:', lawyerId, updates);
      
      // Mock API response
      const currentProfile = await this.getLawyerById(lawyerId);
      if (!currentProfile) {
        throw new Error('Lawyer not found');
      }

      const updatedProfile: LawyerProfile = {
        ...currentProfile,
        ...updates,
        updatedAt: new Date()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return updatedProfile;
    } catch (error) {
      console.error('Error updating lawyer profile:', error);
      throw new Error('Failed to update lawyer profile');
    }
  }

  async searchLawyers(query: string): Promise<LawyerProfile[]> {
    try {
      const allLawyers = await this.getLawyers();
      const searchTerm = query.toLowerCase();
      
      return allLawyers.filter(lawyer =>
        lawyer.specialization.toLowerCase().includes(searchTerm) ||
        lawyer.description.toLowerCase().includes(searchTerm) ||
        lawyer.practiceAreas.some(area => area.toLowerCase().includes(searchTerm)) ||
        lawyer.languages.some(lang => lang.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('Error searching lawyers:', error);
      throw new Error('Failed to search lawyers');
    }
  }
}

export const lawyerService = new LawyerService();
