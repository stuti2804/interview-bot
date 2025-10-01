import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const results = location.state?.results;
  const recordedVideos = location.state?.recordedVideos || [];

  useEffect(() => {
    console.log('📊 RESULTS PAGE LOADED:', {
      hasResults: !!results,
      hasState: !!location.state,
      videosCount: recordedVideos.length,
      results: results,
      locationState: location.state,
      timestamp: new Date().toISOString()
    });
  }, [results, recordedVideos, location.state]);

  // If no results data, redirect to home
  if (!results) {
    console.warn('⚠️ No results data found, redirecting to home');
    navigate('/');
    return null;
  }

  const { individual_scores, overall_score, feedback, role } = results;

  const getScoreColor = (score) => {
    if (score >= 8) return '#28a745'; // Green
    if (score >= 6) return '#ffc107'; // Yellow
    if (score >= 4) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const getScoreGrade = (score) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Average';
    return 'Needs Improvement';
  };

  const startNewInterview = () => {
    console.log('🔄 STARTING NEW INTERVIEW:', {
      currentRole: role,
      timestamp: new Date().toISOString()
    });
    
    try {
      navigate('/');
    } catch (error) {
      console.error('❌ Navigation error:', error);
      setError('Failed to navigate. Please refresh the page.');
    }
  };

  const retakeInterview = () => {
    console.log('🔁 RETAKING INTERVIEW:', {
      role,
      timestamp: new Date().toISOString()
    });
    
    try {
      navigate(`/interview/${role}`);
    } catch (error) {
      console.error('❌ Navigation error:', error);
      setError('Failed to navigate. Please refresh the page.');
    }
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h2>Interview Results</h2>
        <p>Role: <strong>{role.toUpperCase()}</strong></p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="overall-score">
        <h3>Overall Score</h3>
        <div className="score-number">{overall_score}/10</div>
        <div style={{ fontSize: '18px' }}>{getScoreGrade(overall_score)}</div>
      </div>

      <div className="individual-scores">
        <h3>Question-wise Scores</h3>
        {individual_scores.map((score, index) => (
          <div key={index} className="score-item">
            <span className="question-number">Question {index + 1}</span>
            <span 
              className="score-value" 
              style={{ backgroundColor: getScoreColor(score) }}
            >
              {score}/10
            </span>
          </div>
        ))}
      </div>

      <div className="feedback">
        <h3>Feedback</h3>
        <p>{feedback}</p>
        
        <div style={{ marginTop: '20px' }}>
          <h4>Areas to Focus On:</h4>
          <ul style={{ textAlign: 'left' }}>
            {overall_score < 6 && (
              <>
                <li>Use more technical terminology relevant to {role}</li>
                <li>Reduce filler words (um, uh, like)</li>
                <li>Structure your answers better</li>
              </>
            )}
            {overall_score >= 6 && overall_score < 8 && (
              <>
                <li>Provide more detailed technical examples</li>
                <li>Improve answer clarity and organization</li>
                <li>Demonstrate deeper knowledge of concepts</li>
              </>
            )}
            {overall_score >= 8 && (
              <>
                <li>Great job! Keep practicing to maintain this level</li>
                <li>Consider exploring advanced topics in {role}</li>
                <li>Work on interview confidence and presentation</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {recordedVideos.length > 0 && (
        <div className="individual-scores">
          <h3>Answer Summary</h3>
          {recordedVideos.map((video, index) => (
            <div key={index} className="score-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                <span className="question-number">Question {index + 1}</span>
                <span 
                  className="score-value" 
                  style={{ backgroundColor: getScoreColor(video.score) }}
                >
                  {video.score}/10
                </span>
              </div>
              {video.transcript && (
                <div style={{ 
                  fontSize: '14px', 
                  color: '#666', 
                  fontStyle: 'italic',
                  textAlign: 'left',
                  maxHeight: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  &quot;{video.transcript.substring(0, 150)}{video.transcript.length > 150 ? '...' : ''}&quot;
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="action-buttons">
        <button className="btn btn-primary" onClick={retakeInterview}>
          Retake Interview
        </button>
        <button className="btn btn-secondary" onClick={startNewInterview}>
          Try Different Role
        </button>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
        <h4>Understanding Your Scores</h4>
        <div style={{ textAlign: 'left', fontSize: '14px', color: '#666' }}>
          <p><strong>Scoring Criteria:</strong></p>
          <ul>
            <li><strong>Technical Keywords:</strong> Use of relevant technical terms</li>
            <li><strong>Answer Length:</strong> Optimal length (50-200 words)</li>
            <li><strong>Communication:</strong> Clarity and reduced filler words</li>
            <li><strong>Structure:</strong> Well-organized responses</li>
          </ul>
          <p><strong>Score Ranges:</strong></p>
          <ul>
            <li><span style={{ color: '#28a745' }}>8-10: Excellent</span> - Strong technical knowledge and clear communication</li>
            <li><span style={{ color: '#ffc107' }}>6-7: Good</span> - Solid understanding with room for improvement</li>
            <li><span style={{ color: '#fd7e14' }}>4-5: Average</span> - Basic knowledge, needs more practice</li>
            <li><span style={{ color: '#dc3545' }}>0-3: Needs Improvement</span> - Requires significant preparation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Results;