
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LawyerFormData {
  licenseNumber: string;
  specialization: string;
  experienceYears: number;
  practiceAreas: string[];
  languages: string[];
  officeAddress: string;
  phone: string;
  description: string;
  profileImage: File | null;
}

const LawyerRegistrationScreen: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<LawyerFormData>({
    licenseNumber: '',
    specialization: '',
    experienceYears: 0,
    practiceAreas: [],
    languages: [],
    officeAddress: '',
    phone: '',
    description: '',
    profileImage: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const specializations = [
    'Corporate Law',
    'Criminal Law',
    'Family Law',
    'Immigration Law',
    'Civil Rights',
    'Personal Injury',
    'Real Estate',
    'Intellectual Property',
    'Employment Law',
    'Tax Law'
  ];

  const availableLanguages = [
    'English',
    'French',
    'Duala',
    'Fulfulde',
    'Ewondo',
    'Bassa',
    'Bamoun',
    'Arabic'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'experienceYears' ? parseInt(value) || 0 : value
    }));
  };

  const handleArrayChange = (field: 'practiceAreas' | 'languages', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image size must be less than 5MB');
        return;
      }
      
      setFormData(prev => ({ ...prev, profileImage: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.licenseNumber || !formData.specialization || !formData.officeAddress) {
        throw new Error('Please fill in all required fields');
      }

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('userId', user?.id || '');
      submitData.append('licenseNumber', formData.licenseNumber);
      submitData.append('specialization', formData.specialization);
      submitData.append('experienceYears', formData.experienceYears.toString());
      submitData.append('practiceAreas', JSON.stringify(formData.practiceAreas));
      submitData.append('languages', JSON.stringify(formData.languages));
      submitData.append('officeAddress', formData.officeAddress);
      submitData.append('phone', formData.phone);
      submitData.append('description', formData.description);
      
      if (formData.profileImage) {
        submitData.append('profileImage', formData.profileImage);
      }

      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess('Lawyer profile created successfully! Your application is under review.');
      
      // Reset form
      setFormData({
        licenseNumber: '',
        specialization: '',
        experienceYears: 0,
        practiceAreas: [],
        languages: [],
        officeAddress: '',
        phone: '',
        description: '',
        profileImage: null
      });
      setImagePreview(null);
      
    } catch (err: any) {
      setError(err.message || 'Failed to create lawyer profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Become a Lawyer on LawHelp
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create your professional profile to connect with clients
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <div className="text-center">
              <div className="mb-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-primary"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full mx-auto bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">No Image</span>
                  </div>
                )}
              </div>
              <label className="btn-secondary cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                Upload Profile Photo
              </label>
            </div>

            {/* License Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  License Number *
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter your bar license number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Specialization *
                </label>
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select specialization</option>
                  {specializations.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Years of Experience
              </label>
              <input
                type="number"
                name="experienceYears"
                value={formData.experienceYears}
                onChange={handleInputChange}
                className="input-field"
                min="0"
                max="50"
              />
            </div>

            {/* Practice Areas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Practice Areas
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {specializations.map(area => (
                  <label key={area} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.practiceAreas.includes(area)}
                      onChange={() => handleArrayChange('practiceAreas', area)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{area}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Languages Spoken
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableLanguages.map(lang => (
                  <label key={lang} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.languages.includes(lang)}
                      onChange={() => handleArrayChange('languages', lang)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{lang}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Office Address *
                </label>
                <textarea
                  name="officeAddress"
                  value={formData.officeAddress}
                  onChange={handleInputChange}
                  className="input-field"
                  rows={3}
                  placeholder="Enter your office address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="+237 6XX XXX XXX"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Professional Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input-field"
                rows={4}
                placeholder="Describe your experience, achievements, and approach to law..."
              />
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Profile...' : 'Create Lawyer Profile'}
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-500 text-sm text-center bg-green-50 dark:bg-green-900/20 p-3 rounded">
                {success}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LawyerRegistrationScreen;
