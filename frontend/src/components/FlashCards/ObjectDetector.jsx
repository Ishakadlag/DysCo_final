import React, { useRef, useState, useEffect } from "react";
import * as tf from '@tensorflow/tfjs';
import * as cocossd from "@tensorflow-models/coco-ssd";
import Webcam from "react-webcam";
import toast from 'react-hot-toast';
import { Hands } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import axios from "axios";
import { useAuthContext } from '../../hooks/useAuthContext';
import './FlashCards.css'
const apiURL = import.meta.env.VITE_BACKEND_URL;

const MIN_SCORE = 0.6;
const STABILITY_WINDOW = 5;
const STABILITY_THRESHOLD = 3;

const ObjectDetector = () => {
  const [detection, setDetection] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedScore, setDetectedScore] = useState(0);
  const [detectedClass, setDetectedClass] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [bestDetection, setBestDetection] = useState('');
  const [objectInfo, setObjectInfo] = useState('');
  const [objectStatus, setObjectStatus] = useState('Waiting for object...');
  const [mode, setMode] = useState('coco');
  
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const historyRef = useRef([]);
  const handsRef = useRef(null);

  const { user } = useAuthContext();

  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    const fetchObjectInfo = async (objectName) => {
      if (!objectName) {
        setObjectInfo('');
        return;
      }

      try {
        const wikiName = encodeURIComponent(objectName.replace(/\s+/g, '_'));
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${wikiName}`;
        const response = await axios.get(url);
        if (response.data && response.data.extract) {
          setObjectInfo(response.data.extract);
        } else {
          setObjectInfo('No detailed information found.');
        }
      } catch (error) {
        console.error('Object info fetch failed:', error?.message || error);
        setObjectInfo('No detailed information found.');
      }
    };

    fetchObjectInfo(bestDetection);
  }, [bestDetection]);

  const stopDetection = () => {
    setIsDetecting(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current = null;
    }
    setIsReady(false);
    setDetectedClass('');
    setDetectedScore(0);
    setDetection('');
    setObjectStatus('Detection stopped.');
  };

  const ensureHands = async () => {
    if (!handsRef.current) {
      handsRef.current = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });
      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
      });
      handsRef.current.onResults(onHandsResults);
    }
  };

  const startDetection = async () => {
    setIsDetecting(true);
    historyRef.current = [];
    setBestDetection('');
    setObjectStatus('Detecting... hold an object in front of camera');

    if (mode === 'hands') {
      await ensureHands();
      setIsReady(true);
      detectionIntervalRef.current = setInterval(() => {
        detectHands();
      }, 100);
    } else {
      await tf.setBackend('webgl');
      const net = await cocossd.load();
      setIsReady(true);
      detectionIntervalRef.current = setInterval(() => {
        detect(net);
      }, 100);
    }
  };

  const onHandsResults = (results) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const video = webcamRef.current?.video;
    const width = video?.videoWidth || canvasRef.current.width;
    const height = video?.videoHeight || canvasRef.current.height;

    if (video) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(results.image, 0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      drawConnectors(ctx, landmarks, Hands.HAND_CONNECTIONS, { color: 'red', lineWidth: 5 });
      drawLandmarks(ctx, landmarks, { color: 'white', lineWidth: 2 });

      setDetectedClass('hand');
      setDetectedScore(1);
      historyRef.current.unshift('hand');
      if (historyRef.current.length > STABILITY_WINDOW) {
        historyRef.current.pop();
      }

      const counts = historyRef.current.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {});

      const stableClass = Object.keys(counts).find(key => counts[key] >= STABILITY_THRESHOLD);
      if (stableClass) {
        setDetection(stableClass);
        setBestDetection(stableClass);
      }
    } else {
      setDetectedClass('');
      setDetectedScore(0);
    }
  };

  const detectHands = () => {
    if (!handsRef.current || !webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
      return;
    }

    handsRef.current.send({ image: webcamRef.current.video });
  };

  const detect = async (net) => {
    if (!webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
      return;
    }

    const video = webcamRef.current.video;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;

    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    const predictions = await net.detect(video);

    const filtered = predictions
      .filter(item => item.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);

    let mostLikely = null;
    if (filtered.length) {
      let candidate = filtered[0];
      const frameArea = videoWidth * videoHeight;
      const candidateArea = candidate.bbox[2] * candidate.bbox[3];

      // Allow person detection if reasonably confident.
      if (candidate.class === 'person') {
        if (candidate.score < 0.60 || candidateArea < frameArea * 0.05) {
          // if the person is weak, check next best non-person object
          candidate = filtered.find(item => item.class !== 'person') || candidate;
        }
      }

      mostLikely = candidate;
    }

    if (mostLikely) {
      setDetectedClass(mostLikely.class);
      setDetectedScore(mostLikely.score);
      setObjectStatus(`Detected: ${mostLikely.class} at ${(mostLikely.score * 100).toFixed(0)}%`);
      historyRef.current.unshift(mostLikely.class);
      if (historyRef.current.length > STABILITY_WINDOW) {
        historyRef.current.pop();
      }

      const counts = historyRef.current.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {});

      const stableClass = Object.keys(counts).find(key => counts[key] >= STABILITY_THRESHOLD);
      if (stableClass) {
        setDetection(stableClass);
        setBestDetection(stableClass);
        setObjectStatus(`Stable object: ${stableClass}. Fetching info...`);
      }
    } else {
      setObjectStatus('No object detected with sufficient confidence. Please try again.');
    }

    drawRect(filtered, videoWidth, videoHeight);
  };

  const drawRect = (detections, width, height) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    detections.forEach(item => {
      const [x, y, w, h] = item.bbox;
      const label = `${item.class} (${(item.score * 100).toFixed(0)}%)`;

      ctx.strokeStyle = 'lime';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = 'lime';
      ctx.font = '16px Arial';
      ctx.fillText(label, x, y > 20 ? y - 5 : y + 20);
    });
  };

  const createCard = async () => {
    if (!bestDetection) {
      toast.error('No stable object to create card from yet.');
      return;
    }

    try {
      if (user) {
        const config = {
          headers: {
            Authorization: `Bearer ${user?.accessToken}`,
          },
        };
        const response = await axios.post(`${apiURL}/api/v1/card/add/`, {
          name: bestDetection,
          description: objectInfo,
        }, config);
        if (response && response.status === 201) {
          toast.success('Card added successfully');
          setDetection('');
          historyRef.current = [];
          setBestDetection('');
          setObjectInfo('');
        }
      }
    } catch (error) {
      console.log(error);
      toast.error(error?.message);
    }
  };

  return (
    <div className="object__detector__container">
      <div className="webcam__container">
        <Webcam
          ref={webcamRef}
          muted={true}
          className="webcam"
        />
        <canvas
          ref={canvasRef}
          className="canvas"
        />
      </div>
      <div className="model__switch">
        <button
          className={`secondary__btn ${mode === 'coco' ? 'active' : ''}`}
          onClick={() => setMode('coco')}
          disabled={isDetecting}
        >
          COCO-SSD
        </button>
        <button
          className={`secondary__btn ${mode === 'hands' ? 'active' : ''}`}
          onClick={() => setMode('hands')}
          disabled={isDetecting}
        >
          MediaPipe Hands
        </button>
      </div>
      <div className="detection__info">
        <div>Model ready: {isReady ? '✅' : '🔄 wait'}</div>
        <div>Mode: {mode}</div>
        <div>Detected (stable): {bestDetection || 'none'}</div>
        <div>Current inference: {detectedClass ? `${detectedClass} (${(detectedScore * 100).toFixed(1)}%)` : 'none'}</div>
        <div>Status: {objectStatus}</div>
        <div className="object__info">
          <strong>Info:</strong>
          <p>{objectInfo || 'No info available yet. Hold still on a detected object to load info.'}</p>
        </div>
      </div>
      {isDetecting ? (
        <button onClick={stopDetection} className="primary__btn">
          STOP DETECTION
        </button>
      ) : (
        <button onClick={startDetection} className="primary__btn">
          START DETECTION
        </button>
      )}
      {bestDetection && (
        <button onClick={createCard} className="primary__btn">
          CREATE CARD
        </button>
      )}
    </div>
  );
};

export default ObjectDetector;
