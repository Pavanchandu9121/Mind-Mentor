import { useState, useEffect } from 'react';
import axios from 'axios';
import './Profile.css';

export default function Profile() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    photo: '',
    createdAt: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/profile');
      setProfile({
        name: res.data.name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        photo: res.data.photo || '',
        createdAt: res.data.createdAt || ''
      });
    } catch (err) {
      setMessage('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put('http://localhost:5000/api/auth/profile', {
        name: profile.name,
        phone: profile.phone,
        photo: profile.photo
      });
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading && !isEditing) return <div className="page"><div className="loading-spinner"><div className="spinner"></div></div></div>;

  return (
    <div className="profile-page page">
      <div className="container profile-container animate-fadeInUp">
        <div className="card profile-card">
          <div className="profile-header">
            <h2>User Profile</h2>
            {message && <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}
          </div>

          <div className="profile-content">
            <div className="profile-sidebar">
              <div className="avatar-preview">
                {profile.photo ? (
                  <img src={profile.photo} alt="Profile" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {isEditing && (
                <div className="photo-upload">
                  <label htmlFor="photo-upload" className="btn btn-secondary btn-sm">Change Photo</label>
                  <input 
                    id="photo-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload}
                    hidden
                  />
                </div>
              )}
              
              <div className="member-since">
                Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>

            <div className="profile-details">
              {!isEditing ? (
                <div className="details-view">
                  <div className="detail-group">
                    <label>Full Name</label>
                    <p>{profile.name}</p>
                  </div>
                  <div className="detail-group">
                    <label>Email Address</label>
                    <p>{profile.email}</p>
                  </div>
                  <div className="detail-group">
                    <label>Phone Number</label>
                    <p>{profile.phone || 'Not provided'}</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit Profile</button>
                </div>
              ) : (
                <form className="details-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={profile.name} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={profile.email} 
                      disabled 
                      className="disabled-input"
                    />
                    <small>Email cannot be changed</small>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone" 
                      value={profile.phone} 
                      onChange={handleChange} 
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
