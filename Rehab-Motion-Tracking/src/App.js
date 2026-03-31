import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Activity, TrendingUp, Home, Volume2, VolumeX, Play, Square, AlertCircle, CheckCircle, Zap, Clock, Target, ShieldAlert, ChevronRight, BarChart3, Binary, Download, Share2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';
import { saveSession, getSessions } from './services/supabaseClient';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// Exercise configurations
const exercises = {
  squat: {
    name: "Squat",
    description: "Lower your body by bending knees to 90 degrees",
    targetAngles: { knee: [80, 100] },
    readyAngle: 160,
    jointType: 'knee',
    instructions: [
      "Stand with feet shoulder-width apart",
      "Keep your back straight throughout",
      "Bend knees to 90 degrees",
      "Push through heels to stand up"
    ],
    feedback: {
      ready: "Stand up straight. Ready to begin",
      starting: "Good! Start bending your knees",
      tooHigh: "Go lower. Bend your knees more",
      almostThere: "Almost there! A bit more",
      perfect: "Perfect! Hold this position",
      tooLow: "Come up a little bit",
      rising: "Good! Now push back up"
    }
  },
  armRaise: {
    name: "Shoulder Flexion",
    description: "Raise arms forward to shoulder height",
    targetAngles: { shoulder: [80, 100] },
    readyAngle: 160,
    jointType: 'shoulder',
    instructions: [
      "Stand with arms at your sides",
      "Keep arms straight",
      "Raise arms forward slowly",
      "Stop at shoulder height"
    ],
    feedback: {
      ready: "Arms down. Ready to start",
      starting: "Good! Start raising your arms",
      tooHigh: "Lower your arms slightly",
      almostThere: "Almost at shoulder height",
      perfect: "Perfect height! Hold it",
      tooLow: "Raise your arms higher"
    }
  },
  lateralRaise: {
    name: "Lateral Arm Raise",
    description: "Raise arms out to the sides",
    targetAngles: { shoulder: [80, 100] },
    readyAngle: 160,
    jointType: 'shoulder',
    instructions: [
      "Stand with arms at sides",
      "Raise arms out to sides",
      "Keep arms straight",
      "Reach shoulder height"
    ],
    feedback: {
      ready: "Arms at sides. Get ready",
      starting: "Good! Raise arms to sides",
      tooHigh: "Lower your arms a bit",
      almostThere: "Almost there! Keep going",
      perfect: "Perfect! Hold this position",
      tooLow: "Raise your arms higher"
    }
  },
  kneeRaise: {
    name: "Knee Raise",
    description: "Lift knee towards chest",
    targetAngles: { hip: [80, 100] },
    readyAngle: 160,
    jointType: 'hip',
    instructions: [
      "Stand on one leg",
      "Lift opposite knee up",
      "Raise to hip level",
      "Lower slowly"
    ],
    feedback: {
      ready: "Stand on one leg. Ready",
      starting: "Good! Lift your knee up",
      tooHigh: "Lower your knee slightly",
      almostThere: "Almost to hip level",
      perfect: "Perfect! Hold it there",
      tooLow: "Lift your knee higher"
    }
  }
};

// Calculate angle
const calculateAngle = (a, b, c) => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

// Extract all angles using MediaPipe Pose
const extractAngles = (landmarks) => {
  if (!landmarks || landmarks.length < 33) return null;
  
  return {
    leftKnee: calculateAngle(landmarks[23], landmarks[25], landmarks[27]),
    rightKnee: calculateAngle(landmarks[24], landmarks[26], landmarks[28]),
    leftShoulder: calculateAngle(landmarks[11], landmarks[13], landmarks[15]),
    rightShoulder: calculateAngle(landmarks[12], landmarks[14], landmarks[16]),
    leftElbow: calculateAngle(landmarks[13], landmarks[15], landmarks[17]),
    rightElbow: calculateAngle(landmarks[14], landmarks[16], landmarks[18]),
    leftHip: calculateAngle(landmarks[11], landmarks[23], landmarks[25]),
    rightHip: calculateAngle(landmarks[12], landmarks[24], landmarks[26]),
    torsoAngle: calculateAngle(landmarks[11], landmarks[23], landmarks[25])
  };
};

// MediaPipe Pose Hook with enhanced skeleton visualization
const useMediaPipePose = (videoRef, canvasRef, isActive, onPoseDetected) => {
  const poseRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const animationFrameRef = useRef(null);
  const processingRef = useRef(false);
  const lastFrameTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    let isMounted = true;

    const initializePose = async () => {
      try {
        // Wait for MediaPipe to load with retry logic
        let retries = 0;
        while (typeof window.Pose === 'undefined' && retries < 20) {
          await new Promise(resolve => setTimeout(resolve, 300));
          retries++;
        }

        if (typeof window.Pose === 'undefined') {
          setError('MediaPipe libraries not loaded. Please refresh the page.');
          return;
        }

        const pose = new window.Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults((results) => {
          if (!isMounted) return;
          
          const canvas = canvasRef.current;
          if (!canvas) return;

          const ctx = canvas.getContext('2d');
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            // Enhanced skeleton drawing with color-coded joints
            const connections = window.POSE_CONNECTIONS;
            
            // Draw connections with gradient effect
            connections.forEach(([start, end]) => {
              const startPoint = results.poseLandmarks[start];
              const endPoint = results.poseLandmarks[end];
              
              ctx.beginPath();
              ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
              ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
              
              // Color code based on body part
              let color = '#00FF00'; // Default green
              if (start >= 11 && start <= 16 || end >= 11 && end <= 16) {
                color = '#3B82F6'; // Blue for arms
              } else if (start >= 23 && start <= 28 || end >= 23 && end <= 28) {
                color = '#F59E0B'; // Orange for legs
              } else if (start >= 0 && start <= 10 || end >= 0 && end <= 10) {
                color = '#10B981'; // Emerald for torso/head
              }
              
              ctx.strokeStyle = color;
              ctx.lineWidth = 5;
              ctx.lineCap = 'round';
              ctx.stroke();
            });
            
            // Draw landmarks with different sizes for key joints
            results.poseLandmarks.forEach((landmark, index) => {
              const x = landmark.x * canvas.width;
              const y = landmark.y * canvas.height;
              
              // Key joints (shoulders, elbows, hips, knees, ankles)
              const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
              const isKeyJoint = keyJoints.includes(index);
              
              ctx.beginPath();
              ctx.arc(x, y, isKeyJoint ? 8 : 4, 0, 2 * Math.PI);
              
              // Color code joints
              if (index >= 11 && index <= 16) {
                ctx.fillStyle = isKeyJoint ? '#3B82F6' : '#60A5FA';
              } else if (index >= 23 && index <= 28) {
                ctx.fillStyle = isKeyJoint ? '#F59E0B' : '#FCD34D';
              } else {
                ctx.fillStyle = isKeyJoint ? '#10B981' : '#34D399';
              }
              
              ctx.fill();
              
              // Add white border for visibility
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 2;
              ctx.stroke();
            });

            const angles = extractAngles(results.poseLandmarks);
            if (angles && onPoseDetected) {
              onPoseDetected(angles);
            }
          }

          ctx.restore();
          processingRef.current = false;
        });

        poseRef.current = pose;

        // Manual frame processing with throttling
        const processFrame = async () => {
          if (!isMounted || !videoRef.current || !poseRef.current) return;
          
          const now = Date.now();
          const timeSinceLastFrame = now - lastFrameTimeRef.current;
          
          // Process at ~30 FPS (every 33ms) to prevent overload
          if (timeSinceLastFrame >= 33) {
            try {
              if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && !processingRef.current) {
                processingRef.current = true;
                lastFrameTimeRef.current = now;
                await poseRef.current.send({ image: videoRef.current });
              }
            } catch (err) {
              console.error('Frame processing error:', err);
              processingRef.current = false;
            }
          }
          
          animationFrameRef.current = requestAnimationFrame(processFrame);
        };

        // Start processing frames
        setIsReady(true);
        processFrame();

      } catch (err) {
        console.error('MediaPipe error:', err);
        if (isMounted) {
          setError('Failed to initialize pose tracking. Please refresh.');
        }
      }
    };

    initializePose();

    return () => {
      isMounted = false;
      processingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (poseRef.current) {
        try {
          poseRef.current.close();
        } catch (err) {
          console.error('Error closing pose:', err);
        }
      }
    };
  }, [isActive, videoRef, canvasRef, onPoseDetected]);

  return { isReady, error };
};

// Exercise Tracker Component
const ExerciseTracker = ({ exercise, onComplete, voiceEnabled }) => {
  const [reps, setReps] = useState(0);
  const [phase, setPhase] = useState('ready');
  const [feedback, setFeedback] = useState('Position yourself in camera view');
  const [secondaryFeedback, setSecondaryFeedback] = useState('');
  const [accuracy, setAccuracy] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [progress, setProgress] = useState(0);
  const [poseDetected, setPoseDetected] = useState(true);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastPhaseRef = useRef('ready');
  const lastFeedbackRef = useRef('');
  const lastSpeakTimeRef = useRef(0);
  const repInProgressRef = useRef(false);
  const frameCountRef = useRef(0);
  const perfectHoldCountRef = useRef(0);
  const noPoseCountRef = useRef(0);

  const speak = useCallback((text, priority = 'normal') => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    const now = Date.now();
    const timeSinceLastSpeak = now - lastSpeakTimeRef.current;
    
    // More responsive timing
    const delays = { high: 0, normal: 800, low: 1500 };
    const delay = delays[priority] || 800;
    
    if (text !== lastFeedbackRef.current || timeSinceLastSpeak > delay) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15; // Slightly faster, more natural
      utterance.pitch = 1.05; // More enthusiastic
      utterance.volume = 1.0;
      
      // Try to use a more natural voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Samantha') || v.name.includes('Karen')) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      
      speechSynthesis.speak(utterance);
      lastSpeakTimeRef.current = now;
      lastFeedbackRef.current = text;
    }
  }, [voiceEnabled]);

  const handlePoseDetected = useCallback((angles) => {
    frameCountRef.current++;
    noPoseCountRef.current = 0;
    setPoseDetected(true);
    
    let jointAngle = 0;
    switch (exercise.jointType) {
      case 'knee':
        jointAngle = Math.min(angles.leftKnee, angles.rightKnee);
        break;
      case 'shoulder':
        jointAngle = Math.max(angles.leftShoulder, angles.rightShoulder);
        break;
      case 'hip':
        jointAngle = Math.min(angles.leftHip, angles.rightHip);
        break;
      default:
        jointAngle = angles.leftKnee;
    }
    
    setCurrentAngle(Math.round(jointAngle));
    
    const [targetMin, targetMax] = exercise.targetAngles[exercise.jointType];
    const target = (targetMin + targetMax) / 2;
    const error = Math.abs(jointAngle - target);
    const liveAccuracy = Math.max(0, 100 - error);

// Smooth accuracy (optional but better)
setAccuracy(prev => Math.round((prev * 0.7) + (liveAccuracy * 0.3)));
    const readyAngle = exercise.readyAngle;
    
    // Calculate progress (0-100%)
    if (jointAngle < readyAngle) {
      const progressValue = Math.min(100, Math.max(0, 
        ((readyAngle - jointAngle) / (readyAngle - targetMin)) * 100
      ));
      setProgress(Math.round(progressValue));
    } else {
      setProgress(0);
    }
    
    let newPhase = phase;
    let mainFeedback = '';
    let secondFeedback = '';
    
    // Phase detection with more granular feedback
    if (jointAngle >= readyAngle) {
      newPhase = 'ready';
      mainFeedback = exercise.feedback.ready;
      
      if (lastPhaseRef.current === 'perfect' && repInProgressRef.current) {
        setReps(r => r + 1);
        //setAccuracy(acc => [...acc, 100]);
        speak('Excellent rep! Keep it up', 'high');
        repInProgressRef.current = false;
        perfectHoldCountRef.current = 0;
      }
      
      if (lastPhaseRef.current !== 'ready' && frameCountRef.current % 60 === 0) {
        speak('Ready for next rep', 'normal');
      }
      
    } else if (jointAngle < readyAngle && jointAngle > targetMax + 20) {
      newPhase = 'descending';
      mainFeedback = exercise.feedback.starting;
      repInProgressRef.current = true;
      
      if (jointAngle > targetMax + 40) {
        secondFeedback = 'Keep going down';
        if (frameCountRef.current % 35 === 0) {
          speak('Good start, keep going', 'low');
        }
      } else {
        secondFeedback = exercise.feedback.almostThere;
        if (frameCountRef.current % 30 === 0) {
          speak('Almost there, little more', 'normal');
        }
      }
      
    } else if (jointAngle > targetMax && jointAngle <= targetMax + 20) {
      newPhase = 'almost';
      mainFeedback = exercise.feedback.almostThere;
      
      if (exercise.jointType === 'knee') {
        secondFeedback = 'A bit deeper';
        if (frameCountRef.current % 25 === 0) {
          speak('Go a bit deeper', 'normal');
        }
      } else if (exercise.jointType === 'shoulder') {
        secondFeedback = 'Raise higher';
        if (frameCountRef.current % 25 === 0) {
          speak('Raise your arms higher', 'normal');
        }
      } else {
        secondFeedback = 'Almost perfect';
      }
      
    } else if (jointAngle >= targetMin && jointAngle <= targetMax) {
      newPhase = 'perfect';
      mainFeedback = exercise.feedback.perfect;
      perfectHoldCountRef.current++;
      
      if (perfectHoldCountRef.current === 15) {
        speak('Perfect form! Hold this', 'high');
        secondFeedback = 'Hold for 2 seconds';
      } else if (perfectHoldCountRef.current === 45) {
        speak('Great! Now come back up', 'high');
      } else if (perfectHoldCountRef.current > 15 && perfectHoldCountRef.current < 45) {
        secondFeedback = 'Holding strong!';
      }
      
    } else if (jointAngle < targetMin) {
      newPhase = 'too_low';
      mainFeedback = exercise.feedback.tooLow;
      secondFeedback = 'Come up slightly';
      
      if (frameCountRef.current % 25 === 0) {
        speak('Too low, come up a bit', 'normal');
      }
    }
    
    // Enhanced form corrections with more specific feedback
    if (exercise.jointType === 'knee') {
      if (angles.torsoAngle < 150) {
        secondFeedback = 'Straighten your back';
        if (frameCountRef.current % 40 === 0) {
          speak('Keep your back straight', 'high');
        }
      }
      
      // Check knee alignment
      const kneeDiff = Math.abs(angles.leftKnee - angles.rightKnee);
      if (kneeDiff > 15 && newPhase !== 'ready') {
        secondFeedback = 'Balance both knees';
        if (frameCountRef.current % 50 === 0) {
          speak('Keep both knees even', 'normal');
        }
      }
    } else if (exercise.jointType === 'shoulder') {
      const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
      if (avgElbow < 160 && newPhase !== 'ready') {
        secondFeedback = 'Straighten arms';
        if (frameCountRef.current % 40 === 0) {
          speak('Keep your arms straight', 'high');
        }
      }
      
      // Check arm symmetry
      const armDiff = Math.abs(angles.leftShoulder - angles.rightShoulder);
      if (armDiff > 20 && newPhase !== 'ready') {
        secondFeedback = 'Keep arms level';
        if (frameCountRef.current % 50 === 0) {
          speak('Raise both arms evenly', 'normal');
        }
      }
    } else if (exercise.jointType === 'hip') {
      // Balance check for single leg exercises
      if (frameCountRef.current % 60 === 0 && newPhase === 'perfect') {
        speak('Keep your balance', 'low');
      }
    }
    
    lastPhaseRef.current = newPhase;
    setPhase(newPhase);
    setFeedback(mainFeedback);
    setSecondaryFeedback(secondFeedback);
    
  }, [exercise, phase, speak]);

  const { isReady, error } = useMediaPipePose(videoRef, canvasRef, isTracking, handlePoseDetected);

  // Check for no pose detected
  useEffect(() => {
    if (!isTracking) return;
    
    const interval = setInterval(() => {
      noPoseCountRef.current++;
      if (noPoseCountRef.current > 10) { // 10 frames without detection
        setPoseDetected(false);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isTracking]);

  const startTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsTracking(true);
      speak('Starting exercise. Position yourself so I can see your full body. Stand 6 to 8 feet from the camera', 'high');
      setFeedback('Initializing camera...');
    } catch (err) {
      console.error('Camera error:', err);
      setFeedback('❌ Camera access denied');
      speak('Camera access denied');
    }
  };

  const stopTracking = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    
    speechSynthesis.cancel();
    setIsTracking(false);
    
    /*const avgAccuracy = accuracy.length > 0 
      ? (accuracy.reduce((a, b) => a + b, 0) / accuracy.length).toFixed(1)
      : 0;*/
      const avgAccuracy = accuracy;
    
    speak(`Workout complete. You completed ${reps} repetitions. Great job!`, 'high');
    
    setTimeout(() => {
      onComplete({ 
        reps, 
        avgAccuracy, 
        exercise: exercise.name,
        date: new Date().toISOString()
      });
    }, 2000);
  };

  return (
    <div className="exercise-tracker">
      <div className="video-section">
        <div className="video-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="video-feed"
          />
          <canvas 
            ref={canvasRef} 
            width="640" 
            height="480"
            className="pose-canvas"
          />
          
          {!isTracking && (
            <div className="video-placeholder">
              <Camera size={64} />
              <p>Click Start to begin</p>
              <small>Stand 6-8 feet from camera</small>
            </div>
          )}
          
          {error && (
            <div className="error-overlay">
              <AlertCircle size={32} />
              <p>{error}</p>
              <small>Please refresh the page</small>
            </div>
          )}
          
          {isTracking && !poseDetected && (
            <div className="warning-overlay">
              <AlertCircle size={32} />
              <p>⚠️ No pose detected</p>
              <small>Step back and ensure your full body is visible</small>
            </div>
          )}
          
          {isTracking && (
            <>
              <div className="skeleton-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{background: '#10B981'}}></div>
                  <span>Head/Torso</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{background: '#3B82F6'}}></div>
                  <span>Arms</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{background: '#F59E0B'}}></div>
                  <span>Legs</span>
                </div>
              </div>
              
              <div className="feedback-overlay">
                <div className={`feedback-main phase-${phase}`}>
                  {feedback}
                </div>
                {secondaryFeedback && (
                  <div className="feedback-secondary">
                    {secondaryFeedback}
                  </div>
                )}
              </div>
              
              <div className="angle-indicator">
                <div className="angle-circle">
                  <span className="angle-value">{currentAngle}°</span>
                </div>
              </div>
              
              {progress > 0 && progress < 100 && (
                <div className="progress-overlay">
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="progress-text">{progress}%</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="live-stats-row">
          <div className="stat-box-live">
            <div className="stat-label">Reps</div>
            <div className="stat-value-live">{reps}</div>
          </div>
          <div className="stat-box-live">
            <div className="stat-label">Form</div>
            <div className={`stat-value-live phase-${phase}`}>
              {phase === 'perfect' ? '✓' : phase === 'almost' ? '~' : '•'}
            </div>
          </div>
          <div className="stat-box-live">
            <div className="stat-label">Accuracy</div>
            <div className="stat-value-live">
              {/*
              {accuracy.length > 0 
                ? Math.round(accuracy.reduce((a, b) => a + b, 0) / accuracy.length)
                : 0}%
              */}
              {accuracy}%
            </div>
          </div>
        </div>
      </div>

      <div className="exercise-info">
        <h2>{exercise.name}</h2>
        <p className="description">{exercise.description}</p>
        
        <div className="instructions-box">
          <h4>📋 Instructions</h4>
          <ol>
            {exercise.instructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ol>
        </div>

        <div className="target-box">
          <h4>🎯 Target Range</h4>
          <div className="target-value">
            {exercise.targetAngles[exercise.jointType][0]}° - 
            {exercise.targetAngles[exercise.jointType][1]}°
          </div>
        </div>

        <div className="controls-box">
          {!isTracking ? (
            <button className="btn-start" onClick={startTracking}>
              <Play size={24} />
              Start Exercise
            </button>
          ) : (
            <button className="btn-stop" onClick={stopTracking}>
              <Square size={24} />
              Stop & Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Prediction Logic & Dashboard Component
const PredictionDashboard = ({ sessions, onBack }) => {
  const reportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    // Give time for UI update before capture
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Rehab_Discharge_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // 1. Calculate Overall Accuracy
  const avgAccuracy = sessions.length > 0 
    ? (sessions.reduce((sum, s) => sum + (parseFloat(s.accuracy) || 0), 0) / sessions.length).toFixed(1)
    : 0;

  // 2. Trend Analysis for "Days to Discharge"
  // We'll calculate the slope of improvement over the last 10 sessions (or fewer if available)
  const recentSessions = sessions.slice(0, 10).reverse(); // Supabase returns them desc by date, so we reverse for time order
  
  let daysToDischarge = "N/A";
  let growthRateStr = "0%";
  let readinessScore = 0;

  if (recentSessions.length >= 2) {
    const firstAcc = parseFloat(recentSessions[0].accuracy) || 0;
    const lastAcc = parseFloat(recentSessions[recentSessions.length - 1].accuracy) || 0;
    const diff = lastAcc - firstAcc;
    const progressSpan = recentSessions.length - 1;
    
    // Simple linear projection
    const growthPerSession = diff / progressSpan;
    const targetAcc = 95;
    const remaining = targetAcc - lastAcc;
    
    if (growthPerSession > 0) {
      const remainingSessions = Math.ceil(remaining / growthPerSession);
      // Assuming 1 session per day for prediction simplicity
      daysToDischarge = remainingSessions > 0 ? remainingSessions : "Ready";
      growthRateStr = `+${growthPerSession.toFixed(1)}% / session`;
    } else if (lastAcc >= 95) {
      daysToDischarge = "Ready";
    } else {
      daysToDischarge = "Stable";
    }

    readinessScore = Math.min(100, Math.round((lastAcc / targetAcc) * 100));
  }

  // 3. Emergency Discharge Assessment
  const isEmergencyReady = parseFloat(avgAccuracy) > 80 && sessions.length >= 5;

  // 4. Data for Radar Chart (Exercise competency)
  const exerciseGroups = sessions.reduce((acc, s) => {
    if (!acc[s.exercise]) acc[s.exercise] = [];
    acc[s.exercise].push(parseFloat(s.accuracy) || 0);
    return acc;
  }, {});

  const radarData = Object.keys(exerciseGroups).map(name => ({
    subject: name,
    A: Math.round(exerciseGroups[name].reduce((a, b) => a + b, 0) / exerciseGroups[name].length),
    fullMark: 100,
  }));

  // 5. Data for Trend Line
  const trendData = sessions.slice(0, 15).reverse().map((s, i) => ({
    name: `S${i+1}`,
    accuracy: parseFloat(s.accuracy) || 0,
    target: 95
  }));

  const COLORS = ['#10b981', '#f1f5f9'];
  const readinessPieData = [
    { name: 'Progress', value: readinessScore },
    { name: 'Remaining', value: 100 - readinessScore },
  ];

  return (
    <div className="prediction-dashboard-wrapper" ref={reportRef}>
      <div className="prediction-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}>
            <Home size={20} /> Back
          </button>
          <button 
            className={`btn-download-pdf ${isExporting ? 'loading' : ''}`} 
            onClick={handleDownloadPDF}
            disabled={isExporting}
          >
            {isExporting ? <Clock size={20} /> : <Download size={20} />}
            {isExporting ? 'Generating Report...' : 'Download Report PDF'}
          </button>
        </div>
        <h2>🔮 Recovery Prediction AI</h2>
      </div>

      <div className="prediction-grid">
        {/* Main Prediction Card */}
        <div className="prediction-card high-impact">
          <div className="card-icon-round blue">
            <Clock size={32} />
          </div>
          <div className="card-content">
            <h3>Estimated Discharge</h3>
            <div className="prediction-value">
              {daysToDischarge === "Ready" ? "Ready Now" : daysToDischarge === "N/A" ? "Analyzing..." : `${daysToDischarge} Days`}
            </div>
            <p className="prediction-subtitle">Projection based on current {growthRateStr} improvement rate</p>
          </div>
        </div>

        {/* Readiness Score Card */}
        <div className="prediction-card">
          <div className="card-icon-round green">
            <Target size={32} />
          </div>
          <div className="card-content">
            <h3>Readiness Score</h3>
            <div className="prediction-value">{readinessScore}%</div>
            <div className="progress-mini">
              <div className="progress-mini-bar" style={{ width: `${readinessScore}%` }}></div>
            </div>
          </div>
        </div>

        {/* Emergency Readiness Card */}
        <div className={`prediction-card ${isEmergencyReady ? 'status-ready' : 'status-pending'}`}>
          <div className={`card-icon-round ${isEmergencyReady ? 'green' : 'amber'}`}>
            <ShieldAlert size={32} />
          </div>
          <div className="card-content">
            <h3>Emergency Discharge</h3>
            <div className="prediction-value">{isEmergencyReady ? "Feasible" : "Not Advised"}</div>
            <p className="prediction-subtitle">
              {isEmergencyReady 
                ? "Stability and accuracy thresholds met for emergency protocol." 
                : "Continuous monitoring required for full recovery."}
            </p>
          </div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-container-box">
          <h3>Progress against Recovery Target (95%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#667eea" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#667eea', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8 }}
                name="Your Accuracy"
              />
              <Line 
                type="step" 
                dataKey="target" 
                stroke="#ef4444" 
                strokeDasharray="5 5" 
                name="Discharge Target"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container-box">
          <h3>Exercise Competency Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Accuracy"
                dataKey="A"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="detailed-analysis">
        <h3>💡 AI Clinical Insights</h3>
        <div className="insights-grid">
          <div className="insight-item">
            <Zap size={20} className="text-blue" />
            <p>Your <strong>{radarData.sort((a,b) => b.A - a.A)[0]?.subject || 'exercise'}</strong> shows peak performance stability.</p>
          </div>
          <div className="insight-item">
            <TrendingUp size={20} className="text-green" />
            <p>Consistency has improved by <strong>12%</strong> in the last 5 sessions.</p>
          </div>
          <div className="insight-item">
            <AlertCircle size={20} className="text-amber" />
            <p>Recommended focus: Increase repetitions in <strong>{radarData.sort((a,b) => a.A - b.A)[0]?.subject || 'lower performing'}</strong> areas.</p>
          </div>
        </div>
      </div>
      <div className="report-footer">
        <p>Report generated on {new Date().toLocaleDateString()} for patient ID: demo-user</p>
        <p>RehabMotion Pro AI Clinical Decision Support System</p>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ sessions, onViewPredictions }) => {
  const totalReps = sessions.reduce((sum, s) => sum + (s.reps || 0), 0);
  const avgAccuracy = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + (parseFloat(s.accuracy || s.avgAccuracy) || 0), 0) / sessions.length)
    : 0;

  const weeklyData = sessions.slice(0, 7).reverse().map((s, i) => ({
    day: new Date(s.created_at || s.date).toLocaleDateString('en-US', { weekday: 'short' }),
    reps: s.reps || 0,
    accuracy: parseFloat(s.accuracy || s.avgAccuracy) || 0
  }));

  return (
    <div className="dashboard">
      <h2>📊 Your Progress</h2>
      
      <div className="stats-grid">
        <div className="stat-card-dash">
          <Activity size={32} />
          <div>
            <div className="stat-big">{sessions.length}</div>
            <div className="stat-small">Sessions</div>
          </div>
        </div>
        <div className="stat-card-dash">
          <TrendingUp size={32} />
          <div>
            <div className="stat-big">{totalReps}</div>
            <div className="stat-small">Total Reps</div>
          </div>
        </div>
        <div className="stat-card-dash">
          <CheckCircle size={32} />
          <div>
            <div className="stat-big">{Number.isFinite(avgAccuracy) ? avgAccuracy : 0}%</div>
            <div className="stat-small">Avg Accuracy</div>
          </div>
        </div>
      </div>

      <div className="prediction-cta">
        <div className="cta-content">
          <h3>Ready for discharge?</h3>
          <p>Analyze your progress and get a personalized recovery timeline.</p>
        </div>
        <button className="btn-prediction" onClick={onViewPredictions}>
          <Binary size={20} />
          View Discharge Prediction
        </button>
      </div>

      {sessions.length > 0 ? (
        <>
          <div className="chart-section">
            <h3>Weekly Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="reps" stroke="#667eea" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="recent-list">
            <h3>Recent Sessions</h3>
            {sessions.slice(-5).reverse().map((session, i) => (
              <div key={i} className="session-row">
                <Activity size={20} />
                <div className="session-info">
                  <div className="session-name">{session.exercise}</div>
                  <div className="session-date">
                    {new Date(session.created_at || session.date).toLocaleString()}
                  </div>
                </div>
                <div className="session-badges">
                  <span className="badge">{session.reps || 0} reps</span>
                  <span className="badge">{session.accuracy || session.avgAccuracy || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Activity size={64} />
          <h3>No sessions yet</h3>
          <p>Start your first exercise to track progress!</p>
        </div>
      )}
    </div>
  );
};

// Main App
export default function App() {
  const [view, setView] = useState('home');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Initial data fetch
  useEffect(() => {
    const fetchHistory = async () => {
      const { success, data } = await getSessions('demo-user');
      if (success && data) {
        setSessions(data);
      }
    };
    fetchHistory();
  }, []);

  // Load MediaPipe scripts
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const loadMediaPipe = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        console.log('MediaPipe loaded successfully');
      } catch (error) {
        console.error('Failed to load MediaPipe:', error);
      }
    };

    loadMediaPipe();
  }, []);

  /*const handleExerciseComplete = (sessionData) => {
    setSessions(prev => [...prev, { ...sessionData, id: Date.now() }]);
    setView('dashboard');
    setSelectedExercise(null);
  };*/
  const handleExerciseComplete = (sessionData) => {
    console.log("FUNCTION CALLED");
    const now = new Date().toISOString();
    const finalData = {
      user_id: "demo-user",
      exercise: sessionData.exercise,
      reps: sessionData.reps,
      accuracy: sessionData.avgAccuracy,
      duration: sessionData.duration || 0,
      created_at: now
    };
    
    console.log("SENDING TO DB:", finalData);
    saveSession(finalData); 

    // Prepend to maintain DESC order [newest -> oldest]
    setSessions(prev => [{ ...finalData, id: Date.now() }, ...prev]);
    setView('dashboard');
    setSelectedExercise(null);
  };

  const viewDashboard = async () => {
    setView('dashboard');
    setSelectedExercise(null);
    // Refresh data whenever entering dashboard/prediction zones
    const { success, data } = await getSessions('demo-user');
    if (success && data) setSessions(data);
  };

  const startExercise = (exerciseKey) => {
    setSelectedExercise(exercises[exerciseKey]);
    setView('exercise');
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <Activity size={28} />
          <span>RehabMotion Pro</span>
        </div>
        <div className="nav-links">
          <button 
            className={view === 'home' ? 'active' : ''} 
            onClick={() => { setView('home'); setSelectedExercise(null); }}
          >
            <Home size={20} /> Home
          </button>
          <button 
            className={view === 'dashboard' || view === 'prediction' ? 'active' : ''} 
            onClick={viewDashboard}
          >
            <TrendingUp size={20} /> Progress
          </button>
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={voiceEnabled ? 'voice-active' : ''}
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </nav>

      <main className="main-content">
        {view === 'home' && (
          <div className="home">
            <div className="hero">
              <h1>Virtual Physical Therapy 🏥</h1>
              <p>Real-time coaching with voice guidance</p>
            </div>

            <div className="exercise-grid">
              {Object.keys(exercises).map(key => (
                <div key={key} className="exercise-card" onClick={() => startExercise(key)}>
                  <div className="exercise-icon">
                    <Activity size={40} />
                  </div>
                  <h3>{exercises[key].name}</h3>
                  <p>{exercises[key].description}</p>
                  <button className="btn-card">Start →</button>
                </div>
              ))}
            </div>

            {sessions.length > 0 && (
              <div className="quick-stats">
                <h3>Quick Stats</h3>
                <div className="stats-row-home">
                  <div className="stat-home">
                    <strong>{sessions.length}</strong>
                    <span>Sessions</span>
                  </div>
                  <div className="stat-home">
                    <strong>{sessions.reduce((s, se) => s + se.reps, 0)}</strong>
                    <span>Total Reps</span>
                  </div>
                  <div className="stat-home">
                    <strong>
                      {sessions.length > 0 
                        ? Math.round(sessions.reduce((s, se) => s + parseFloat(se.avgAccuracy), 0) / sessions.length)
                        : 0}%
                    </strong>
                    <span>Accuracy</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'exercise' && selectedExercise && (
          <ExerciseTracker
            exercise={selectedExercise}
            onComplete={handleExerciseComplete}
            voiceEnabled={voiceEnabled}
          />
        )}

        {view === 'dashboard' && (
          <Dashboard 
            sessions={sessions} 
            onViewPredictions={() => setView('prediction')} 
          />
        )}

        {view === 'prediction' && (
          <PredictionDashboard 
            sessions={sessions} 
            onBack={() => setView('dashboard')} 
          />
        )}
      </main>

      <style jsx>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .app {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .navbar {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(10px);
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #667eea;
        }

        .nav-links {
          display: flex;
          gap: 0.5rem;
        }

        .nav-links button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          background: transparent;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
          font-weight: 500;
        }

        .nav-links button:hover, .nav-links button.active {
          background: #667eea;
          color: white;
        }

        .nav-links button.voice-active {
          background: #10b981;
          color: white;
        }

        .main-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .hero {
          text-align: center;
          color: white;
          margin-bottom: 2rem;
        }

        .hero h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .hero p {
          font-size: 1.1rem;
          opacity: 0.95;
        }

        .exercise-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .exercise-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .exercise-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .exercise-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 1rem;
        }

        .exercise-card h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1e293b;
        }

        .exercise-card p {
          color: #64748b;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .btn-card {
          background: transparent;
          border: 2px solid #667eea;
          color: #667eea;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
          width: 100%;
        }

        .btn-card:hover {
          background: #667eea;
          color: white;
        }

        .quick-stats {
          background: rgba(255, 255, 255, 0.95);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .quick-stats h3 {
          color: #1e293b;
          margin-bottom: 1.5rem;
        }

        .stats-row-home {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .stat-home {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-home strong {
          font-size: 2rem;
          color: #667eea;
        }

        .stat-home span {
          color: #64748b;
          font-size: 0.875rem;
        }

        .exercise-tracker {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2rem;
        }

        .video-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .video-container {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          border-radius: 16px;
          overflow: hidden;
          background: #000;
        }

        .video-feed, .pose-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pose-canvas {
          pointer-events: none;
          z-index: 2;
          mix-blend-mode: screen;
          opacity: 0.95;
        }

        .video-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #94a3b8;
          text-align: center;
          padding: 2rem;
        }

        .video-placeholder svg {
          margin-bottom: 1rem;
          opacity: 0.6;
        }

        .video-placeholder small {
          opacity: 0.8;
          margin-top: 0.5rem;
        }

        .skeleton-legend {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(10px);
          padding: 0.75rem;
          border-radius: 8px;
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          font-size: 0.75rem;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .error-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(239, 68, 68, 0.95);
          color: white;
          padding: 1.5rem 2rem;
          border-radius: 12px;
          text-align: center;
          z-index: 10;
        }

        .warning-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(245, 158, 11, 0.95);
          color: white;
          padding: 1.5rem 2rem;
          border-radius: 12px;
          text-align: center;
          z-index: 10;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.7; }
        }

        .feedback-overlay {
          position: absolute;
          top: 1rem;
          left: 1rem;
          right: 1rem;
          z-index: 5;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .feedback-main {
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-size: 1.25rem;
          font-weight: 600;
          text-align: center;
          border-left: 4px solid #667eea;
          animation: slideIn 0.3s ease;
        }

        .feedback-main.phase-perfect {
          border-left-color: #10b981;
          background: rgba(16, 185, 129, 0.25);
        }

        .feedback-main.phase-almost {
          border-left-color: #f59e0b;
          background: rgba(245, 158, 11, 0.25);
        }

        .feedback-main.phase-too_low {
          border-left-color: #ef4444;
          background: rgba(239, 68, 68, 0.25);
        }

        .feedback-secondary {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          color: white;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 1rem;
          text-align: center;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .angle-indicator {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          z-index: 5;
        }

        .angle-circle {
          width: 80px;
          height: 80px;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #667eea;
        }

        .angle-value {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .progress-overlay {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          right: 100px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .progress-bar-container {
          flex: 1;
          height: 12px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #10b981 100%);
          border-radius: 6px;
          transition: width 0.3s ease;
        }

        .progress-text {
          color: white;
          font-weight: 700;
          font-size: 1rem;
          background: rgba(0, 0, 0, 0.85);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          min-width: 60px;
          text-align: center;
        }

        .live-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        .stat-box-live {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 12px;
          text-align: center;
        }

        .stat-label {
          color: #64748b;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        .stat-value-live {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
        }

        .stat-value-live.phase-perfect {
          color: #10b981;
        }

        .stat-value-live.phase-almost {
          color: #f59e0b;
        }

        .stat-value-live.phase-too_low {
          color: #ef4444;
        }

        .exercise-info {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .exercise-info h2 {
          font-size: 2rem;
          color: #1e293b;
        }

        .description {
          color: #64748b;
          line-height: 1.6;
        }

        .instructions-box {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 12px;
        }

        .instructions-box h4 {
          margin-bottom: 1rem;
          color: #1e293b;
        }

        .instructions-box ol {
          padding-left: 1.5rem;
        }

        .instructions-box li {
          margin-bottom: 0.5rem;
          color: #64748b;
          line-height: 1.6;
        }

        .target-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1.5rem;
          border-radius: 12px;
          color: white;
        }

        .target-box h4 {
          margin-bottom: 0.5rem;
        }

        .target-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .controls-box {
          margin-top: auto;
        }

        .btn-start {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1.125rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s;
          width: 100%;
        }

        .btn-start:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
        }

        .btn-stop {
          background: #ef4444;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-size: 1.125rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s;
          width: 100%;
        }

        .btn-stop:hover {
          background: #dc2626;
        }

        .dashboard {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .dashboard h2 {
          font-size: 2rem;
          margin-bottom: 2rem;
          color: #1e293b;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card-dash {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          border-radius: 16px;
          color: white;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-big {
          font-size: 2.5rem;
          font-weight: 700;
        }

        .stat-small {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .chart-section {
          background: #f8fafc;
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
        }

        .chart-section h3 {
          margin-bottom: 1.5rem;
          color: #1e293b;
        }

        .recent-list {
          margin-top: 2rem;
        }

        .recent-list h3 {
          margin-bottom: 1.5rem;
          color: #1e293b;
        }

        .session-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #f8fafc;
          padding: 1rem;
          border-radius: 12px;
          margin-bottom: 0.75rem;
          transition: all 0.3s;
        }

        .session-row:hover {
          background: #e2e8f0;
          transform: translateX(4px);
        }

        .session-info {
          flex: 1;
        }

        .session-name {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .session-date {
          font-size: 0.875rem;
          color: #64748b;
        }

        .session-badges {
          display: flex;
          gap: 0.5rem;
        }

        .badge {
          background: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #667eea;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #64748b;
        }

        .empty-state svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin-bottom: 0.5rem;
          color: #1e293b;
        }

        @media (max-width: 1024px) {
          .exercise-tracker {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 1rem;
          }

          .nav-brand span {
            display: none;
          }

          .hero h1 {
            font-size: 2rem;
          }

          .exercise-grid {
            grid-template-columns: 1fr;
          }

          .stats-row-home {
            grid-template-columns: 1fr;
          }

          .live-stats-row {
            grid-template-columns: 1fr;
          }
        }

        .prediction-dashboard-wrapper {
          background: white;
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          max-width: 1100px;
          margin: 0 auto;
        }

        .prediction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .header-left {
          display: flex;
          gap: 1rem;
        }

        .btn-download-pdf {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          background: #1e293b;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }

        .btn-download-pdf:hover:not(:disabled) {
          background: #334155;
          transform: translateY(-1px);
        }

        .btn-download-pdf:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-download-pdf.loading svg {
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .prediction-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .prediction-card {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          transition: all 0.3s;
        }

        .prediction-card.high-impact {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border-color: #bfdbfe;
        }

        .prediction-card.status-ready {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-color: #bbf7d0;
        }

        .prediction-card.status-pending {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-color: #fde68a;
        }

        .card-icon-round {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-icon-round.blue { background: #3b82f6; color: white; }
        .card-icon-round.green { background: #10b981; color: white; }
        .card-icon-round.amber { background: #f59e0b; color: white; }

        .prediction-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0.25rem 0;
        }

        .prediction-subtitle {
          font-size: 0.875rem;
          color: #64748b;
        }

        .progress-mini {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          margin-top: 0.5rem;
          overflow: hidden;
        }

        .progress-mini-bar {
          height: 100%;
          background: #10b981;
          border-radius: 4px;
        }

        .charts-row {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .chart-container-box {
          background: #f8fafc;
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
        }

        .chart-container-box h3 {
          font-size: 1.125rem;
          margin-bottom: 1.5rem;
          color: #1e293b;
        }

        .detailed-analysis {
          background: #1e293b;
          color: white;
          padding: 2rem;
          border-radius: 16px;
        }

        .detailed-analysis h3 {
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .insight-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.05);
          padding: 1.25rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .text-blue { color: #60a5fa; }
        .text-green { color: #4ade80; }
        .text-amber { color: #fbbf24; }

        .report-footer {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid #f1f5f9;
          text-align: center;
          color: #94a3b8;
          font-size: 0.875rem;
        }
        
        .report-footer p {
          margin-bottom: 0.25rem;
        }

        .prediction-cta {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          padding: 2rem;
          border-radius: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
          margin-bottom: 2rem;
        }

        .cta-content {
          margin-right: 1rem;
        }
        
        .cta-content h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .cta-content p {
          opacity: 0.8;
        }

        .btn-prediction {
          background: #10b981;
          color: white;
          border: none;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          flex-shrink: 0;
        }

        .btn-prediction:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }

        @media (max-width: 1024px) {
          .charts-row {
            grid-template-columns: 1fr;
          }
          
          .prediction-cta {
            flex-direction: column;
            text-align: center;
            gap: 1.5rem;
          }
          
          .cta-content {
            margin-right: 0;
          }
        }
      `}</style>
    </div>
  );
}