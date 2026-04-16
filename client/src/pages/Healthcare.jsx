import { useState, useEffect } from 'react';
import axios from 'axios';
import './Healthcare.css';

export default function Healthcare() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const token = localStorage.getItem('mm_token');
      const res = await axios.get('http://localhost:5000/api/healthcare/therapists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTherapists(res.data);
    } catch (err) {
      console.error('Failed to fetch therapists', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedTherapist) return;
    
    setIsBooking(true);
    try {
      const token = localStorage.getItem('mm_token');
      const res = await axios.post('http://localhost:5000/api/healthcare/book', {
        therapistId: selectedTherapist.id,
        notes: bookingNotes
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setSuccessMessage(res.data.message);
      setSelectedTherapist(null);
      setBookingNotes('');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (err) {
      console.error('Booking failed', err);
      alert('Failed to book appointment. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return <div className="page"><div className="loading-spinner"><div className="spinner"></div></div></div>;
  }

  return (
    <div className="healthcare-page page">
      <div className="container">
        
        <div className="healthcare-header animate-fadeInUp">
          <div className="header-icon">🩺</div>
          <h1>Clinical Support Directory</h1>
          <p>Connect with licensed professionals for personalized care and therapy.</p>
        </div>

        {successMessage && (
          <div className="alert alert-success animate-fadeIn">
            ✅ {successMessage}
          </div>
        )}

        <div className="healthcare-grid animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          {therapists.map(therapist => (
            <div key={therapist.id} className="therapist-card card">
              <div className="therapist-avatar">{therapist.image}</div>
              <div className="therapist-info">
                <h3>{therapist.name}</h3>
                <p className="therapist-cred">{therapist.credentials} • {therapist.experience}</p>
                <div className="therapist-specs">
                  {therapist.specialties.map((spec, i) => (
                    <span key={i} className="badge badge-primary">{spec}</span>
                  ))}
                </div>
                <p className="therapist-avail">🕒 {therapist.availability}</p>
                <button 
                  className="btn btn-secondary btn-full btn-book"
                  onClick={() => setSelectedTherapist(therapist)}
                >
                  Request Appointment
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Booking Modal */}
        {selectedTherapist && (
          <div className="modal-overlay">
            <div className="modal-content card animate-fadeIn">
              <button className="modal-close" onClick={() => setSelectedTherapist(null)}>✕</button>
              <h2>Book Appointment</h2>
              <div className="modal-therapist-preview">
                <span className="modal-avatar">{selectedTherapist.image}</span>
                <div>
                  <strong>{selectedTherapist.name}</strong>
                  <p>{selectedTherapist.credentials}</p>
                </div>
              </div>
              
              <form onSubmit={handleBookAppointment} className="booking-form">
                <div className="form-group">
                  <label htmlFor="notes">Reason for visit / Notes (Optional)</label>
                  <textarea
                    id="notes"
                    className="form-input"
                    rows="4"
                    placeholder="Briefly describe what you'd like to discuss..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                  />
                </div>
                <p className="booking-disclaimer">
                  By clicking submit, the clinic will be notified and will contact you via your registered email to confirm the exact time and telehealth link.
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedTherapist(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={isBooking}>
                    {isBooking ? 'Requesting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
