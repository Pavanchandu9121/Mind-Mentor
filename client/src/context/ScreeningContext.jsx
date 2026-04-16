import { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ScreeningContext = createContext();

export function ScreeningProvider({ children }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingResult, setProcessingResult] = useState(null);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const submitScreening = async (videoBlob, questionsArray) => {
    setIsProcessing(true);
    setProcessingStatus('Uploading recording for analysis...');
    setError(null);
    setProcessingResult(null);

    try {
      const formData = new FormData();
      formData.append('video', videoBlob, 'screening-session.webm');
      formData.append('questions', JSON.stringify(questionsArray));

      const token = localStorage.getItem('mm_token');
      const response = await axios.post(
        'http://localhost:5000/api/screening/analyze',
        formData,
        {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          // 5 min timeout for heavy ML post-processing
          timeout: 300000 
        }
      );

      setProcessingResult(response.data);
      setProcessingStatus('Analysis Complete!');
    } catch (err) {
      console.error('Screening upload failed:', err);
      setError(
        err.response?.data?.message || 
        'Failed to process the screening. The analysis service may not be running yet.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResult = () => {
    setProcessingResult(null);
    setError(null);
  };

  return (
    <ScreeningContext.Provider value={{
      isProcessing,
      processingStatus,
      setProcessingStatus,
      processingResult,
      error,
      submitScreening,
      clearResult
    }}>
      {children}
      
      {/* Global Toast Notification */}
      {(isProcessing || processingResult || error) && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: error ? '#ef4444' : isProcessing ? '#3b82f6' : '#10b981',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isProcessing ? '⏳ AI is analyzing your video...' : error ? '❌ Analysis Failed' : '✅ Analysis Complete!'}
          </div>
          
          {isProcessing && (
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {processingStatus}
              <br/>
              <span style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>(You can safely navigate to other pages)</span>
            </div>
          )}
          
          {error && (
            <div style={{ fontSize: '0.9rem' }}>{error}</div>
          )}

          {processingResult && (
            <button 
              onClick={() => {
                const res = processingResult;
                clearResult();
                navigate('/screening/results', { state: { result: res } });
              }}
              style={{
                background: 'white', color: '#10b981', border: 'none', 
                padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                fontWeight: 'bold', marginTop: '4px'
              }}
            >
              View Full Results Now
            </button>
          )}

          {!isProcessing && (
            <button 
              onClick={clearResult}
              style={{
                position: 'absolute', top: '8px', right: '8px', 
                background: 'transparent', border: 'none', color: 'white',
                cursor: 'pointer', fontSize: '1rem'
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}
    </ScreeningContext.Provider>
  );
}

export const useScreening = () => useContext(ScreeningContext);
