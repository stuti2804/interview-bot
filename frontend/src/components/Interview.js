import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../utils/api';

const Interview = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedVideos, setRecordedVideos] = useState([]);
  const [individualScores, setIndividualScores] = useState([]);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);

  // Fetch questions when component mounts
  useEffect(() => {
    fetchQuestions();
    return () => {
      // Cleanup: stop camera stream when component unmounts
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    };
  }, [role]);

  const fetchQuestions = async () => {
    console.log('🔄 FETCHING QUESTIONS START:', { role, timestamp: new Date().toISOString() });
    
    try {
      console.log('📞 API Call: Fetching questions for role:', role);
      const response = await axios.get(`/api/questions/${role}`);
      
      console.log('✅ QUESTIONS FETCHED SUCCESSFULLY:', {
        role,
        questionsCount: response.data.questions?.length || 0,
        questions: response.data.questions,
        timestamp: new Date().toISOString()
      });
      
      setQuestions(response.data.questions);
      setError(''); // Clear any previous errors
      
    } catch (error) {
      console.error('❌ ERROR FETCHING QUESTIONS:', {
        role,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      let errorMessage = 'Failed to fetch questions. ';
      
      if (!error.response) {
        errorMessage += 'Network error - check if backend server is running.';
      } else if (error.response.status === 404) {
        errorMessage += 'Invalid role selected.';
      } else if (error.response.status >= 500) {
        errorMessage += 'Server error occurred.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    }
  };

  const startCamera = async () => {
    console.log('📹 STARTING CAMERA:', { timestamp: new Date().toISOString() });
    
    try {
      console.log('🎥 Requesting media permissions...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      console.log('✅ CAMERA ACCESS GRANTED:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        videoSettings: mediaStream.getVideoTracks()[0]?.getSettings(),
        audioSettings: mediaStream.getAudioTracks()[0]?.getSettings(),
        timestamp: new Date().toISOString()
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('📺 Video element source set successfully');
      } else {
        console.warn('⚠️ Video ref is null, cannot set srcObject');
      }
      
      setError('');
      
    } catch (error) {
      console.error('❌ CAMERA ACCESS ERROR:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      let errorMessage = 'Unable to access camera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access in your browser.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported by your browser.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += 'Please check camera permissions and try again.';
      }
      
      setError(errorMessage);
    }
  };

  const startRecording = async () => {
    console.log('🎬 STARTING RECORDING:', { 
      hasStream: !!stream,
      questionIndex: currentQuestionIndex,
      timestamp: new Date().toISOString() 
    });
    
    if (!stream) {
      console.log('📹 No stream available, starting camera first...');
      await startCamera();
      return;
    }

    try {
      console.log('🎥 Initializing MediaRecorder...');
      recordedChunksRef.current = [];
      
      // Check MediaRecorder support
      if (!MediaRecorder.isTypeSupported('video/webm')) {
        console.warn('⚠️ webm not supported, falling back to default');
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('📊 Data available:', { 
          dataSize: event.data.size,
          totalChunks: recordedChunksRef.current.length + 1,
          timestamp: new Date().toISOString()
        });
        
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('🛑 RECORDING STOPPED:', {
          totalChunks: recordedChunksRef.current.length,
          totalSize: recordedChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0),
          timestamp: new Date().toISOString()
        });
        
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        console.log('🎞️ Video blob created:', { size: blob.size, type: blob.type });
        processVideo(blob);
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        setError('Recording error occurred. Please try again.');
        setIsRecording(false);
      };

      mediaRecorderRef.current.start(1000); // Record in 1-second intervals
      setIsRecording(true);
      setRecordingTime(0);
      
      console.log('✅ RECORDING STARTED SUCCESSFULLY');
      
      // Start recording timer
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= 300) { // 5 minutes max
            console.log('⏰ Maximum recording time reached, stopping...');
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
      setRecordingInterval(interval);

    } catch (error) {
      console.error('❌ RECORDING START ERROR:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      setError('Failed to start recording. Please check your camera and microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    console.log('🛑 STOPPING RECORDING:', {
      isRecording,
      hasMediaRecorder: !!mediaRecorderRef.current,
      recordingTime,
      timestamp: new Date().toISOString()
    });
    
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        console.log('✅ MediaRecorder stopped successfully');
      } catch (error) {
        console.error('❌ Error stopping MediaRecorder:', error);
      }
      
      setIsRecording(false);
      
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
        console.log('⏰ Recording timer cleared');
      }
    } else {
      console.warn('⚠️ Cannot stop recording - no active recording found');
    }
  };

  const processVideo = async (videoBlob) => {
    console.log('🎬 PROCESSING VIDEO START:', {
      blobSize: videoBlob.size,
      blobType: videoBlob.type,
      questionIndex: currentQuestionIndex,
      role,
      timestamp: new Date().toISOString()
    });
    
    setIsProcessing(true);
    setError(''); // Clear any previous errors
    
    try {
      // Validate video blob
      if (!videoBlob || videoBlob.size === 0) {
        throw new Error('Invalid video blob - size is 0');
      }
      
      console.log('📤 UPLOADING VIDEO:', {
        filename: `question_${currentQuestionIndex + 1}.webm`,
        size: videoBlob.size,
        type: videoBlob.type
      });
      
      // Upload video file
      const formData = new FormData();
      formData.append('video', videoBlob, `question_${currentQuestionIndex + 1}.webm`);

      const uploadResponse = await axios.post('/upload-video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 1 minute for upload
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log('📤 Upload progress:', percentCompleted + '%');
        }
      });

      console.log('✅ VIDEO UPLOADED SUCCESSFULLY:', uploadResponse.data);
      const filename = uploadResponse.data.filename;

      console.log('🔄 PROCESSING VIDEO FOR TRANSCRIPTION:', {
        filename,
        role,
        questionIndex: currentQuestionIndex
      });
      
      // Process video for transcription and scoring
      const processResponse = await axios.post('/process-video', {
        filename: filename,
        role: role,
        question_index: currentQuestionIndex
      });

      console.log('✅ VIDEO PROCESSED SUCCESSFULLY:', {
        score: processResponse.data.score,
        transcriptLength: processResponse.data.transcript?.length || 0,
        metrics: processResponse.data.metrics,
        filename
      });
      
      const score = processResponse.data.score;
      const transcript = processResponse.data.transcript;
      const metrics = processResponse.data.metrics;

      // Store the score and video info
      const updatedScores = [...individualScores, score];
      const updatedVideos = [...recordedVideos, {
        questionIndex: currentQuestionIndex,
        transcript: transcript,
        score: score,
        filename: filename,
        metrics: metrics
      }];
      
      console.log('📊 UPDATED SCORES AND VIDEOS:', {
        newScore: score,
        totalScores: updatedScores.length,
        currentScores: updatedScores,
        timestamp: new Date().toISOString()
      });
      
      setIndividualScores(updatedScores);
      setRecordedVideos(updatedVideos);
      setIsProcessing(false);
      setError(''); // Clear any errors

      // Move to next question or finish interview
      if (currentQuestionIndex < questions.length - 1) {
        console.log('➡️ Moving to next question:', currentQuestionIndex + 1);
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        console.log('🏁 All questions completed, finishing interview...');
        finishInterview(updatedScores, updatedVideos);
      }

    } catch (error) {
      console.error('❌ VIDEO PROCESSING ERROR:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack,
        questionIndex: currentQuestionIndex,
        blobSize: videoBlob.size,
        timestamp: new Date().toISOString()
      });
      
      let errorMessage = 'Failed to process video. ';
      
      if (!error.response) {
        errorMessage += 'Network error - check backend server connection.';
      } else if (error.response.status === 413) {
        errorMessage += 'Video file too large. Please record shorter answers.';
      } else if (error.response.status === 400) {
        errorMessage += 'Invalid video format. Please try recording again.';
      } else if (error.response.status >= 500) {
        errorMessage += 'Server processing error. Please try again.';
      } else {
        errorMessage += 'Please try recording your answer again.';
      }
      
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  const finishInterview = async (allScores, finalRecordedVideos = null) => {
    console.log('🏁 FINISHING INTERVIEW:', {
      scoresCount: allScores.length,
      scores: allScores,
      role,
      videosCount: (finalRecordedVideos || recordedVideos).length,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('📊 Calculating final results...');
      
      const response = await axios.post('/api/results', {
        individual_scores: allScores,
        role: role
      });

      console.log('✅ RESULTS CALCULATED SUCCESSFULLY:', {
        overallScore: response.data.overall_score,
        individualScores: response.data.individual_scores,
        feedback: response.data.feedback,
        timestamp: new Date().toISOString()
      });

      const finalVideos = finalRecordedVideos || recordedVideos;
      
      console.log('🧭 NAVIGATING TO RESULTS PAGE:', {
        resultsData: response.data,
        videosCount: finalVideos.length,
        timestamp: new Date().toISOString()
      });

      // Navigate to results page with the results data
      navigate('/results', { 
        state: { 
          results: response.data,
          recordedVideos: finalVideos
        } 
      });

    } catch (error) {
      console.error('❌ ERROR FINISHING INTERVIEW:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        scoresData: allScores,
        role,
        timestamp: new Date().toISOString()
      });
      
      let errorMessage = 'Failed to calculate results. ';
      
      if (!error.response) {
        errorMessage += 'Network error - check backend server connection.';
      } else if (error.response.status >= 500) {
        errorMessage += 'Server error occurred while calculating scores.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skipQuestion = () => {
    console.log('⏭️ SKIPPING QUESTION:', {
      questionIndex: currentQuestionIndex,
      question: questions[currentQuestionIndex],
      timestamp: new Date().toISOString()
    });
    
    // Add a default low score for skipped question
    const skippedScore = 2.0;
    const updatedScores = [...individualScores, skippedScore];
    const updatedVideos = [...recordedVideos, {
      questionIndex: currentQuestionIndex,
      transcript: "(Question skipped)",
      score: skippedScore,
      filename: null,
      skipped: true
    }];
    
    console.log('📊 Updated data after skip:', {
      newScore: skippedScore,
      totalScores: updatedScores.length,
      currentScores: updatedScores,
      timestamp: new Date().toISOString()
    });
    
    setIndividualScores(updatedScores);
    setRecordedVideos(updatedVideos);
    setError(''); // Clear any previous errors
    
    if (currentQuestionIndex < questions.length - 1) {
      console.log('➡️ Moving to next question after skip');
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      console.log('🏁 Last question skipped, finishing interview...');
      finishInterview(updatedScores, updatedVideos);
    }
  };

  if (questions.length === 0) {
    return <div className="loading">Loading questions...</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="interview-container">
      <div className="interview-header">
        <h2>{role.toUpperCase()} Interview</h2>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <p>Question {currentQuestionIndex + 1} of {questions.length}</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="question-card">
        <div className="question-text">
          <strong>Q{currentQuestionIndex + 1}:</strong> {currentQuestion}
        </div>

        <div className="video-section">
          <video
            ref={videoRef}
            className="video-preview"
            autoPlay
            muted
            playsInline
          />

          {isRecording && (
            <div className="recording-status">
              🔴 Recording... {formatTime(recordingTime)} (Max: 5:00)
            </div>
          )}

          {isProcessing && (
            <div className="processing-status">
              Processing your answer... Please wait.
            </div>
          )}

          <div className="recording-controls">
            {!stream && (
              <button className="btn btn-primary" onClick={startCamera}>
                Start Camera
              </button>
            )}

            {stream && !isRecording && !isProcessing && (
              <>
                <button className="btn btn-success" onClick={startRecording}>
                  Start Recording
                </button>
                <button className="btn btn-secondary" onClick={skipQuestion}>
                  Skip Question
                </button>
              </>
            )}

            {isRecording && (
              <button className="btn btn-danger" onClick={stopRecording}>
                Stop Recording
              </button>
            )}
          </div>

          <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            <p>💡 Tips:</p>
            <ul style={{ textAlign: 'left', display: 'inline-block' }}>
              <li>Speak clearly and confidently</li>
              <li>Use technical terms relevant to {role}</li>
              <li>Keep your answer between 1-3 minutes</li>
              <li>Look at the camera while speaking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;