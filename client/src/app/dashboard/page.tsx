"use client";
import React, { useState, useRef } from 'react';
import { FiUploadCloud, FiDownload } from 'react-icons/fi';
import { BsImage, BsCameraVideo, BsTrash, BsShieldCheck, BsShieldX, BsMic, BsEmojiSmile, BsEmojiNeutral, BsEmojiFrown, BsEmojiAngry, BsEmojiSurprise } from 'react-icons/bs';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { AiOutlineWarning } from 'react-icons/ai';
import { MdWaves, MdOutlineVideoSettings } from 'react-icons/md';
import jsPDF from 'jspdf';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface FilePreview {
  url: string;
  type: 'image' | 'video' | 'audio';
  file: File;
}

interface DeepfakeMetrics {
  distortionScore: number;
  jawSymmetry: number;
  eyeSymmetry: number;
  backgroundObstruction: number;
}

interface VideoMetrics {
  faceDistortion: number;
  lipSyncDeviation: number;
  frameConsistency: number;
  audioVideoMismatch: number;
}

interface DetailedInsight {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface SentimentData {
  angry: number;
  happy: number;
  neutral: number;
  sad: number;
  surprise: number;
}

interface AudioAnalysisData {
  cosine_similarity: number;
  euclidean_distance: number;
  mismatch_score: number;
}

interface AudioAnalysisResponse {
  metrics: AudioAnalysisData;
  faceDetectionRate: number;
}
interface FrameAnalysisData {
  total_frames: number;
  abnormal_frames: number;
}

interface FaceDistortionData {
  total_frames: number;
  distorted_faces: number;
}

interface VideoAnalysisResponse {
  abnormal_frames_detected: number;
  analysis_result: string;
  confidence_score: number;
  detailed_scores: {
    audio_visual_sync_score: number;
    face_quality_score: number;
    frame_quality_score: number;
  };
  distorted_faces: number;
  mismatch_score: number;
  risk_level: string;
  score_explanation: {
    audio_sync: string;
    face_analysis: string;
    frame_analysis: string;
  };
  total_frames_processed: number;
  processing_time: number;
}

function isImageMetrics(metrics: DeepfakeMetrics | VideoMetrics): metrics is DeepfakeMetrics {
  return 'distortionScore' in metrics;
}

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

const formatPercentage = (value: number): number => {
  return Number(value.toFixed(2));
};

const generateFallbackInsights = (metrics: DeepfakeMetrics): DetailedInsight[] => [
    {
        title: 'Overall Analysis',
        description: `Image analysis shows ${metrics.distortionScore}% distortion score`,
        severity: metrics.distortionScore > 70 ? 'high' : 'medium'
    },
    {
        title: 'Facial Features',
        description: `Jaw symmetry: ${metrics.jawSymmetry}%, Eye symmetry: ${metrics.eyeSymmetry}%`,
        severity: metrics.jawSymmetry > 70 ? 'high' : 'low'
    },
    {
        title: 'Background Analysis',
        description: `Background obstruction score: ${metrics.backgroundObstruction}%`,
        severity: metrics.backgroundObstruction > 70 ? 'high' : 'low'
    },
    {
        title: 'Overall Risk',
        description: 'Combined analysis of all metrics indicates potential manipulation',
        severity: 'medium'
    }
];

const DashboardPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [metrics, setMetrics] = useState<DeepfakeMetrics | VideoMetrics | null>(null);
  const [insights, setInsights] = useState<DetailedInsight[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [sentimentFile, setSentimentFile] = useState<FilePreview | null>(null);
  const [sentimentDragActive, setSentimentDragActive] = useState(false);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const sentimentVideoRef = useRef<HTMLInputElement>(null);
  const [audioFile, setAudioFile] = useState<FilePreview | null>(null);
  const [audioDragActive, setAudioDragActive] = useState(false);
  const [analyzingAudio, setAnalyzingAudio] = useState(false);
  const [audioData, setAudioData] = useState<AudioAnalysisResponse | null>(null);
  const audioVideoRef = useRef<HTMLInputElement>(null);
  
  const [frameFile, setFrameFile] = useState<FilePreview | null>(null);
  const [frameDragActive, setFrameDragActive] = useState(false);
  const [analyzingFrames, setAnalyzingFrames] = useState(false);
  const [frameData, setFrameData] = useState<FrameAnalysisData | null>(null);
  const frameVideoRef = useRef<HTMLInputElement>(null);
  const [distortionFile, setDistortionFile] = useState<FilePreview | null>(null);
  const [distortionDragActive, setDistortionDragActive] = useState(false);
  const [analyzingDistortions, setAnalyzingDistortions] = useState(false);
  const [distortionData, setDistortionData] = useState<FaceDistortionData | null>(null);
  const distortionVideoRef = useRef<HTMLInputElement>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoAnalysisResponse | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    if (!isImage && !isVideo && !isAudio) {
      alert('Please upload only image, video, or audio files');
      return;
    }

    const url = URL.createObjectURL(file);
    setFilePreview({
      url,
      type: isImage ? 'image' : isVideo ? 'video' : 'audio',
      file
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleImageSubmit = async () => {
    if (!filePreview || filePreview.type !== 'image') return;
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('image', filePreview.file);

      console.log('Image Analysis Request:', {
        fileName: filePreview.file.name,
        fileSize: `${(filePreview.file.size / (1024 * 1024)).toFixed(2)} MB`,
        endpoint: 'http://127.0.0.1:5000/predict'
      });

      const response = await axios.post('http://127.0.0.1:5000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const faceData = response.data.face_distortion?.[0] || {};
      const imageMetrics: DeepfakeMetrics = {
        distortionScore: Number((faceData.distortion_score || 0).toFixed(2)),
        jawSymmetry: Number((faceData.jaw_symmetry || 0).toFixed(2)),
        eyeSymmetry: Number((faceData.eye_symmetry || 0).toFixed(2)),
        backgroundObstruction: Number((response.data.best_score || 0).toFixed(2))
      };

      setMetrics(imageMetrics);
      await generateGeminiInsights(imageMetrics);
      setAnalysisComplete(true);

    } catch (error) {
      handleError(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVideoSubmit = async () => {
    if (!filePreview || filePreview.type !== 'video') return;
    setIsAnalyzing(true);

    try {
        const formData = new FormData();
        formData.append('video', filePreview.file);

        console.log('Video Analysis Request:', {
            fileName: filePreview.file.name,
            fileSize: `${(filePreview.file.size / (1024 * 1024)).toFixed(2)} MB`,
            endpoint: 'http://127.0.0.1:5000/process_video'
        });

        const response = await fetch('http://127.0.0.1:5000/process_video', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Video Analysis Response:', data);
        setVideoAnalysis(data);
        setAnalysisComplete(true);

    } catch (error) {
        console.error('Error during analysis:', error);
        alert('Error analyzing video. Please try again.');
    } finally {
        setIsAnalyzing(false);
    }
  };

  const generateGeminiInsights = async (imageMetrics: DeepfakeMetrics) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `
        Analyze these deepfake detection metrics and provide insights:
        - Distortion Score: ${imageMetrics.distortionScore}%
        - Jaw Symmetry: ${imageMetrics.jawSymmetry}%
        - Eye Symmetry: ${imageMetrics.eyeSymmetry}%
        - Background Obstruction: ${imageMetrics.backgroundObstruction}%

        Provide 4 insights in this exact JSON format:
        [
          {
            "title": "Insight title",
            "description": "Detailed explanation",
            "severity": "high/medium/low"
          }
        ]
      `;

      const result = await model.generateContent(prompt);
      const geminiResponse = await result.response;
      const text = geminiResponse.text();
      
      try {
        const cleanedText = text.trim().replace(/```json|```/g, '').trim();
        const parsedInsights = JSON.parse(cleanedText);
        
        if (Array.isArray(parsedInsights)) {
          setInsights(parsedInsights.map(insight => ({
            title: insight.title || '',
            description: insight.description || '',
            severity: insight.severity as 'high' | 'medium' | 'low' || 'low'
          })));
        }
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        setInsights(generateFallbackInsights(imageMetrics));
      }
    } catch (geminiError) {
      console.error('Error getting Gemini insights:', geminiError);
      setInsights(generateFallbackInsights(imageMetrics));
    }
  };

  const handleError = (error: any) => {
    console.error('Request Error:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Error Response:', error.response.data);
        console.error('Error Status:', error.response.status);
        alert(`Server Error: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
      } else if (error.request) {
        console.error('No Response Received');
        alert('No response received from server. Please check if the server is running.');
      } else {
        console.error('Request Setup Error:', error.message);
        alert('Error setting up the request: ' + error.message);
      }
    } else {
      console.error('Non-Axios Error:', error);
      alert('An unexpected error occurred');
    }
  };

  const handleSubmit = async () => {
    if (!filePreview) return;

    switch (filePreview.type) {
      case 'image':
        await handleImageSubmit();
        break;
      case 'video':
        await handleVideoSubmit();
        break;
      default:
        alert('Unsupported file type');
    }
  };

  const generateReport = async () => {
    if (!videoAnalysis) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Add header
    doc.setFontSize(24);
    doc.setTextColor(44, 62, 80);
    doc.text('Deepfake Analysis Report', pageWidth/2, 20, { align: 'center' });
    
    // Add timestamp
    doc.setFontSize(12);
    doc.setTextColor(127, 140, 141);
    doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth/2, 30, { align: 'center' });
    
    // Add confidence score
    doc.setFontSize(18);
    doc.setTextColor(52, 73, 94);
    doc.text('Analysis Results', 20, 50);
    doc.setFontSize(14);
    doc.text(`Confidence Score: ${videoAnalysis.confidence_score.toFixed(1)}%`, 20, 60);
    doc.text(`Risk Level: ${videoAnalysis.risk_level}`, 20, 70);
    doc.text(`Analysis Result: ${videoAnalysis.analysis_result}`, 20, 80);
    
    // Add detailed scores
    doc.setFontSize(16);
    doc.text('Detailed Analysis', 20, 100);
    doc.setFontSize(12);
    doc.text(`Face Quality Score: ${videoAnalysis.detailed_scores.face_quality_score.toFixed(1)}%`, 30, 110);
    doc.text(`Frame Quality Score: ${videoAnalysis.detailed_scores.frame_quality_score.toFixed(1)}%`, 30, 120);
    doc.text(`Audio-Visual Sync Score: ${videoAnalysis.detailed_scores.audio_visual_sync_score.toFixed(1)}%`, 30, 130);
    
    // Add frame analysis
    doc.setFontSize(16);
    doc.text('Frame Analysis', 20, 150);
    doc.setFontSize(12);
    doc.text(`Total Frames Processed: ${videoAnalysis.total_frames_processed}`, 30, 160);
    doc.text(`Abnormal Frames Detected: ${videoAnalysis.abnormal_frames_detected}`, 30, 170);
    doc.text(`Distorted Faces: ${videoAnalysis.distorted_faces}`, 30, 180);
    
    // Add explanations
    doc.setFontSize(16);
    doc.text('Detailed Explanations', 20, 200);
    doc.setFontSize(12);
    doc.text(videoAnalysis.score_explanation.face_analysis, 30, 210, { maxWidth: pageWidth - 40 });
    doc.text(videoAnalysis.score_explanation.frame_analysis, 30, 220, { maxWidth: pageWidth - 40 });
    doc.text(videoAnalysis.score_explanation.audio_sync, 30, 230, { maxWidth: pageWidth - 40 });
    
    // Add footer
    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.text('Generated by DeepFake Detection System', pageWidth/2, 280, { align: 'center' });
    
    // Save the PDF
    doc.save(`deepfake_analysis_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const hexToRGB = (hex: string, alpha: number = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return alpha !== 1 ? [r, g, b, alpha] as const : [r, g, b] as const;
  };

  const getDeepfakeScore = () => {
    if (!metrics) return 0;
    if (filePreview?.type === 'image' && isImageMetrics(metrics)) {
      return Math.round(
        (metrics.distortionScore + metrics.jawSymmetry + 
         metrics.eyeSymmetry + metrics.backgroundObstruction) / 4
      );
    }
    const videoMetrics = metrics as unknown as VideoMetrics;
    return Math.round(
      (videoMetrics.faceDistortion + videoMetrics.lipSyncDeviation + 
       videoMetrics.frameConsistency + videoMetrics.audioVideoMismatch) / 4
    );
  };

  const getScoreColor = (score: number) => {
    if (score < 50) return '#22c55e';
    if (score <= 75) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreStatus = (score: number) => {
    if (score < 50) return 'Likely Authentic';
    if (score <= 75) return 'Potentially Manipulated';
    return 'Likely Deepfake';
  };

  const getScoreDescription = (score: number) => {
    if (score < 50) return 'shows strong signs of authenticity with minimal manipulation markers.';
    if (score <= 75) return 'exhibits some concerning patterns that suggest possible manipulation.';
    return 'displays significant indicators of digital manipulation and deepfake characteristics.';
  };

  const getMetricColor = (value: number): string => {
    if (value >= 75) return '#ef4444';
    if (value >= 50) return '#f59e0b';
    return '#22c55e';
  };

  const getMetricsData = () => filePreview?.type === 'image' ? [
    { 
      label: "Distortion Score", 
      value: (metrics && isImageMetrics(metrics) ? metrics.distortionScore : 0),
      color: getMetricColor(metrics && isImageMetrics(metrics) ? metrics.distortionScore : 0)
    },
    { 
      label: "Jaw Symmetry", 
      value: (metrics && isImageMetrics(metrics) ? metrics.jawSymmetry : 0),
      color: getMetricColor(metrics && isImageMetrics(metrics) ? metrics.jawSymmetry : 0)
    },
    { 
      label: "Eye Symmetry", 
      value: (metrics && isImageMetrics(metrics) ? metrics.eyeSymmetry : 0),
      color: getMetricColor(metrics && isImageMetrics(metrics) ? metrics.eyeSymmetry : 0)
    },
    { 
      label: "Background Analysis", 
      value: (metrics && isImageMetrics(metrics) ? metrics.backgroundObstruction : 0),
      color: getMetricColor(metrics && isImageMetrics(metrics) ? metrics.backgroundObstruction : 0)
    }
  ] : [
    { 
      label: "Face Distortion", 
      value: (metrics as VideoMetrics)?.faceDistortion || 0,
      color: getMetricColor((metrics as VideoMetrics)?.faceDistortion || 0)
    },
    { 
      label: "Lip Sync Deviation", 
      value: (metrics as VideoMetrics)?.lipSyncDeviation || 0,
      color: getMetricColor((metrics as VideoMetrics)?.lipSyncDeviation || 0)
    },
    { 
      label: "Frame Consistency", 
      value: (metrics as VideoMetrics)?.frameConsistency || 0,
      color: getMetricColor((metrics as VideoMetrics)?.frameConsistency || 0)
    },
    { 
      label: "Audio-Video Sync", 
      value: (metrics as VideoMetrics)?.audioVideoMismatch || 0,
      color: getMetricColor((metrics as VideoMetrics)?.audioVideoMismatch || 0)
    }
  ];

  const renderMetricCard = (title: string, value: number, color: string) => (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all transform hover:scale-105 border border-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-50"/>
      <div className="relative">
        <div className="w-24 h-24 mx-auto mb-4 relative">
          <CircularProgressbar
            value={value}
            text={`${formatPercentage(value)}%`}
            styles={buildStyles({
              pathColor: color,
              textColor: color,
              trailColor: '#f3f4f6',
              strokeLinecap: 'round'
            })}
          />
          {value > 75 && (
            <div className="absolute top-0 right-0 -mr-2 -mt-2 animate-pulse">
              <AiOutlineWarning className="text-red-500 text-xl" />
            </div>
          )}
        </div>
        <h3 className="text-center text-gray-700 font-medium relative">
          <span className="relative z-10">{title}</span>
          <span 
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-1 w-12 rounded-full opacity-20"
            style={{ backgroundColor: color }}
          />
        </h3>
      </div>
    </div>
  );

  const renderAnalysisResults = () => (
    <div className="space-y-8" ref={reportRef}>
      <div className="bg-white rounded-3xl p-10 shadow-2xl overflow-hidden border border-blue-100">
        <div className="flex items-center justify-between mb-12">
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg blur opacity-25 animate-pulse" />
            <div className="relative flex items-center space-x-4">
              {getDeepfakeScore() > 50 ? (
                <BsShieldX className="text-red-500 text-5xl animate-pulse" />
              ) : (
                <BsShieldCheck className="text-emerald-500 text-5xl" />
              )}
              <div>
                <h2 className="text-4xl font-bold text-gray-800 mb-2">Analysis Complete</h2>
                <p className="text-blue-600">Processed on {new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          {(filePreview?.type === 'video' || filePreview?.type === 'audio') && (
            <button
              onClick={generateReport}
              className="group relative px-8 py-3 bg-blue-600 rounded-xl text-white font-medium shadow-lg hover:bg-blue-700 transition-all duration-300"
            >
              <span className="relative flex items-center gap-2">
                <FiDownload className="text-xl" />
                Export Report
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mb-16 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8">
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-full rounded-full animate-ping"
                  style={{
                    border: '2px solid',
                    borderColor: getScoreColor(getDeepfakeScore()),
                    animationDelay: `${i * 300}ms`,
                    animationDuration: '2s',
                    opacity: 0.2
                  }}
                />
              ))}
            </div>
            
            <CircularProgressbar
              value={getDeepfakeScore()}
              text={`${getDeepfakeScore()}%`}
              styles={buildStyles({
                pathColor: getScoreColor(getDeepfakeScore()),
                textColor: getScoreColor(getDeepfakeScore()),
                trailColor: '#e2e8f0'
              })}
            />
          </div>

          <div className="flex-1 ml-12">
            <h3 className={`text-5xl font-bold mb-4 text-[${getScoreColor(getDeepfakeScore())}]`}>
              {getScoreStatus(getDeepfakeScore())}
            </h3>
            <p className="text-gray-700 text-xl leading-relaxed">
              Our AI analysis indicates this content {getScoreDescription(getDeepfakeScore())}
            </p>
          </div>
        </div>

        <div className="relative mb-16">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent rounded-xl"/>
          <div className="relative grid grid-cols-4 gap-6 p-6">
            {getMetricsData().map((metric, index) => (
              <div 
                key={index} 
                className="bg-white rounded-xl p-6 group hover:shadow-lg transition-all duration-300 border border-gray-100"
              >
                <div className="relative h-32 mb-4">
                  <CircularProgressbar
                    value={metric.value}
                    text={`${formatPercentage(metric.value)}%`}
                    styles={buildStyles({
                      pathColor: metric.color,
                      textColor: metric.color,
                      trailColor: '#f3f4f6',
                      pathTransitionDuration: 1.5,
                      strokeLinecap: 'round'
                    })}
                  />
                  {metric.value > 75 && (
                    <div className="absolute top-0 right-0 -mr-2 -mt-2 animate-pulse">
                      <AiOutlineWarning className="text-red-500 text-xl" />
                    </div>
                  )}
                </div>
                <span className="block text-center text-gray-700 font-medium group-hover:text-blue-600 transition-colors">
                  {metric.label}
                </span>
                <div className="mt-2 text-center text-sm">
                  <span 
                    className={`inline-block px-3 py-1 rounded-full ${
                      metric.value >= 75 ? 'bg-red-100 text-red-700' :
                      metric.value >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}
                  >
                    {metric.value >= 75 ? 'High Risk' :
                     metric.value >= 50 ? 'Medium Risk' :
                     'Low Risk'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <MdWaves className="text-blue-600" />
            Detailed Analysis
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100 hover:shadow-lg transition-all duration-300"
              >
                <h4 className="font-semibold text-gray-800 mb-2">{insight.title}</h4>
                <p className="text-gray-600 text-sm">{insight.description}</p>
                <div className={`absolute top-4 right-4 h-2 w-2 rounded-full ${
                  insight.severity === 'high' ? 'bg-red-500' :
                  insight.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyzing = () => (
    <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-semibold text-gray-700">Analyzing your {filePreview?.type}...</h2>
      <p className="text-gray-500 mt-2">This may take a few moments</p>
    </div>
  );

  const handleSentimentDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setSentimentDragActive(true);
    } else if (e.type === "dragleave") {
      setSentimentDragActive(false);
    }
  };

  const handleSentimentFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please upload only video files for sentiment analysis');
      return;
    }
    const url = URL.createObjectURL(file);
    setSentimentFile({
      url,
      type: 'video',
      file
    });
  };

  const handleSentimentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSentimentDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleSentimentFile(file);
  };

  const handleSentimentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSentimentFile(file);
  };

  const analyzeSentiment = async () => {
    if (!sentimentFile) return;
    setAnalyzingSentiment(true);

    try {
      const formData = new FormData();
      formData.append('video', sentimentFile.file);

      const response = await axios.post('http://127.0.0.1:5000/analyze_sentiment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSentimentData(response.data);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      alert('Error analyzing sentiment. Please try again.');
    } finally {
      setAnalyzingSentiment(false);
    }
  };

  const getDominantEmotion = () => {
    if (!sentimentData) return null;
    const emotions = Object.entries(sentimentData);
    return emotions.reduce((max, emotion) => 
      emotion[1] > max[1] ? emotion : max
    )[0];
  };

  const renderSentimentSection = () => (
    <div className="mt-12 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-blue-600 mb-6">
          Video Sentiment Analysis
        </h2>

        {!sentimentFile ? (
          <div 
            className={`
              border-2 border-dashed rounded-xl p-8
              ${sentimentDragActive ? 'border-blue-500 bg-blue-50' : 'border-blue-200'}
              transition-all duration-300 ease-in-out
              hover:border-blue-400 hover:bg-blue-50/50
            `}
            onDragEnter={handleSentimentDrag}
            onDragLeave={handleSentimentDrag}
            onDragOver={handleSentimentDrag}
            onDrop={handleSentimentDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <BsCameraVideo size="3rem" className="text-blue-500" />
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-700">
                  Drag and drop your video here
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or click to select a video file
                </p>
              </div>
              <button
                onClick={() => sentimentVideoRef.current?.click()}
                className="px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Select Video
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-700">Video Preview</h3>
              <button 
                onClick={() => {
                  URL.revokeObjectURL(sentimentFile.url);
                  setSentimentFile(null);
                  setSentimentData(null);
                }}
                className="p-2 hover:bg-red-50 rounded-full transition-colors"
              >
                <BsTrash size="1.25rem" className="text-red-500" />
              </button>
            </div>

            <video 
              src={sentimentFile.url} 
              controls 
              className="w-full rounded-lg"
            />

            {!sentimentData && (
              <button
                onClick={analyzeSentiment}
                disabled={analyzingSentiment}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
              >
                {analyzingSentiment ? 'Analyzing...' : 'Check Sentiments'}
              </button>
            )}

            {sentimentData && (
              <div className="space-y-6">
                <div className="grid grid-cols-5 gap-4">
                  <div className="flex flex-col items-center p-4 bg-yellow-50 rounded-xl">
                    <BsEmojiSmile className="text-4xl text-yellow-500 mb-2" />
                    <span className="font-medium text-yellow-700">Happy</span>
                    <span className="text-yellow-600">{sentimentData.happy}</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-red-50 rounded-xl">
                    <BsEmojiAngry className="text-4xl text-red-500 mb-2" />
                    <span className="font-medium text-red-700">Angry</span>
                    <span className="text-red-600">{sentimentData.angry}</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-blue-50 rounded-xl">
                    <BsEmojiNeutral className="text-4xl text-blue-500 mb-2" />
                    <span className="font-medium text-blue-700">Neutral</span>
                    <span className="text-blue-600">{sentimentData.neutral}</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
                    <BsEmojiFrown className="text-4xl text-gray-500 mb-2" />
                    <span className="font-medium text-gray-700">Sad</span>
                    <span className="text-gray-600">{sentimentData.sad}</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-purple-50 rounded-xl">
                    <BsEmojiSurprise className="text-4xl text-purple-500 mb-2" />
                    <span className="font-medium text-purple-700">Surprise</span>
                    <span className="text-purple-600">{sentimentData.surprise}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    Dominant Emotion
                  </h4>
                  <p className="text-2xl font-bold text-blue-600 capitalize">
                    {getDominantEmotion()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={sentimentVideoRef}
          type="file"
          accept="video/*"
          onChange={handleSentimentSelect}
          className="hidden"
        />
      </div>
    </div>
  );

  const handleAudioDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setAudioDragActive(true);
    } else if (e.type === "dragleave") {
      setAudioDragActive(false);
    }
  };

  const handleAudioFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please upload only video files for audio analysis');
      return;
    }
    const url = URL.createObjectURL(file);
    setAudioFile({
      url,
      type: 'video',
      file
    });
  };

  const handleAudioDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAudioDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAudioFile(file);
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAudioFile(file);
  };

  const analyzeAudio = async () => {
    if (!audioFile) return;
    setAnalyzingAudio(true);

    try {
      const formData = new FormData();
      formData.append('video', audioFile.file);

      const response = await axios.post('http://127.0.0.1:5000/analyze_audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const [metrics, faceDetectionRate] = response.data;
      setAudioData({
        metrics,
        faceDetectionRate
      });
    } catch (error) {
      console.error('Error analyzing audio:', error);
      alert('Error analyzing audio-video sync. Please try again.');
    } finally {
      setAnalyzingAudio(false);
    }
  };

  const renderAudioSection = () => (
    <div className="mt-12 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
          <MdWaves className="text-2xl" />
          Audio-Video Sync Analysis
        </h2>

        {!audioFile ? (
          <div 
            className={`
              border-2 border-dashed rounded-xl p-8
              ${audioDragActive ? 'border-blue-500 bg-blue-50' : 'border-blue-200'}
              transition-all duration-300 ease-in-out
              hover:border-blue-400 hover:bg-blue-50/50
            `}
            onDragEnter={handleAudioDrag}
            onDragLeave={handleAudioDrag}
            onDragOver={handleAudioDrag}
            onDrop={handleAudioDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-blue-50 rounded-full">
                <BsMic size="2.5rem" className="text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-700">
                  Upload Video for Audio Analysis
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  We'll analyze the audio-video synchronization
                </p>
              </div>
              <button
                onClick={() => audioVideoRef.current?.click()}
                className="px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Select Video
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-700">Video Preview</h3>
              <button 
                onClick={() => {
                  URL.revokeObjectURL(audioFile.url);
                  setAudioFile(null);
                  setAudioData(null);
                }}
                className="p-2 hover:bg-red-50 rounded-full transition-colors"
              >
                <BsTrash size="1.25rem" className="text-red-500" />
              </button>
            </div>

            <video 
              src={audioFile.url} 
              controls 
              className="w-full rounded-lg"
            />

            {!audioData && (
              <button
                onClick={analyzeAudio}
                disabled={analyzingAudio}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
              >
                {analyzingAudio ? 'Analyzing...' : 'Check Audio-Video Sync'}
              </button>
            )}

            {audioData && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Face Detection Rate</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">
                        {(audioData.faceDetectionRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Mismatch Score</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">
                        {audioData.metrics.mismatch_score.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Cosine Similarity-Detect inconsistencies between real and manipulated images or videos</h4>
                    <span className="text-lg font-semibold text-gray-800">
                      {audioData.metrics.cosine_similarity.toFixed(3)}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Euclidean Distance</h4>
                    <span className="text-lg font-semibold text-gray-800">
                      {audioData.metrics.euclidean_distance.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Analysis Summary</h4>
                  <p className="text-gray-600">
                    {audioData.metrics.mismatch_score > 0.8 
                      ? "High probability of audio-video mismatch detected. The audio may have been manipulated."
                      : audioData.metrics.mismatch_score > 0.5
                      ? "Moderate signs of audio-video inconsistency found. Further verification recommended."
                      : "Good audio-video synchronization detected. The content appears authentic."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={audioVideoRef}
          type="file"
          accept="video/*"
          onChange={handleAudioSelect}
          className="hidden"
        />
      </div>
    </div>
  );
  
  const handleFrameDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setFrameDragActive(true);
    } else if (e.type === "dragleave") {
      setFrameDragActive(false);
    }
  };

  const handleFrameFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please upload only video files for frame analysis');
      return;
    }
    const url = URL.createObjectURL(file);
    setFrameFile({
      url,
      type: 'video',
      file
    });
  };

  const handleFrameDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFrameDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFrameFile(file);
  };

  const handleFrameSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFrameFile(file);
  };

  const analyzeFrames = async () => {
    if (!frameFile) return;
    setAnalyzingFrames(true);

    try {
      const formData = new FormData();
      formData.append('video', frameFile.file);

      const response = await axios.post('http://localhost:5000/analyze_frame', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const [total_frames, abnormal_frames] = response.data;
      setFrameData({
        total_frames,
        abnormal_frames
      });
    } catch (error) {
      console.error('Error analyzing frames:', error);
      alert('Error analyzing video frames. Please try again.');
    } finally {
      setAnalyzingFrames(false);
    }
  };

  const renderFrameSection = () => (
    <div className="mt-12 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
          <MdOutlineVideoSettings className="text-2xl" />
          Frame Anomaly Detection
        </h2>

        {!frameFile ? (
          <div 
            className={`
              border-2 border-dashed rounded-xl p-8
              ${frameDragActive ? 'border-blue-500 bg-blue-50' : 'border-blue-200'}
              transition-all duration-300 ease-in-out
              hover:border-blue-400 hover:bg-blue-50/50
            `}
            onDragEnter={handleFrameDrag}
            onDragLeave={handleFrameDrag}
            onDragOver={handleFrameDrag}
            onDrop={handleFrameDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-blue-50 rounded-full">
                <BsCameraVideo size="2.5rem" className="text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-700">
                  Upload Video for Frame Analysis
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  We'll analyze each frame for anomalies and inconsistencies
                </p>
              </div>
              <button
                onClick={() => frameVideoRef.current?.click()}
                className="px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Select Video
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-700">Video Preview</h3>
              <button 
                onClick={() => {
                  URL.revokeObjectURL(frameFile.url);
                  setFrameFile(null);
                  setFrameData(null);
                }}
                className="p-2 hover:bg-red-50 rounded-full transition-colors"
              >
                <BsTrash size="1.25rem" className="text-red-500" />
              </button>
            </div>

            <video 
              src={frameFile.url} 
              controls 
              className="w-full rounded-lg"
            />

            {!frameData && (
              <button
                onClick={analyzeFrames}
                disabled={analyzingFrames}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
              >
                {analyzingFrames ? 'Analyzing Frames...' : 'Analyze Frame Anomalies'}
              </button>
            )}

            {frameData && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Total Frames</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">
                        {frameData.total_frames}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Abnormal Frames</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">
                        {frameData.abnormal_frames}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Analysis Summary</h4>
                  <p className="text-gray-600">
                    {frameData.abnormal_frames / frameData.total_frames > 0.1 
                      ? "High number of frame anomalies detected. This video shows significant signs of manipulation."
                      : frameData.abnormal_frames / frameData.total_frames > 0.05
                      ? "Moderate number of frame anomalies detected. The video may have been altered."
                      : "Low number of frame anomalies detected. The video appears to be authentic."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={frameVideoRef}
          type="file"
          accept="video/*"
          onChange={handleFrameSelect}
          className="hidden"
        />
      </div>
    </div>
  );

  const handleDistortionDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDistortionDragActive(true);
    } else if (e.type === "dragleave") {
      setDistortionDragActive(false);
    }
  };

  const handleDistortionFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please upload only video files for face distortion analysis');
      return;
    }
    const url = URL.createObjectURL(file);
    setDistortionFile({
      url,
      type: 'video',
      file
    });
  };

  const handleDistortionDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDistortionDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleDistortionFile(file);
  };

  const handleDistortionSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleDistortionFile(file);
  };

  const analyzeDistortions = async () => {
    if (!distortionFile) return;
    setAnalyzingDistortions(true);

    try {
      const formData = new FormData();
      formData.append('video', distortionFile.file);

      const response = await axios.post('http://localhost:5000/analyze_distortions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const [total_frames, distorted_faces] = response.data;
      setDistortionData({
        total_frames,
        distorted_faces
      });
    } catch (error) {
      console.error('Error analyzing face distortions:', error);
      alert('Error analyzing face distortions. Please try again.');
    } finally {
      setAnalyzingDistortions(false);
    }
  };

  const renderDistortionSection = () => (
    <div className="mt-12 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
          <BsImage className="text-2xl" />
          Face Distortion Analysis
        </h2>

        {!distortionFile ? (
          <div 
            className={`
              border-2 border-dashed rounded-xl p-8
              ${distortionDragActive ? 'border-blue-500 bg-blue-50' : 'border-blue-200'}
              transition-all duration-300 ease-in-out
              hover:border-blue-400 hover:bg-blue-50/50
            `}
            onDragEnter={handleDistortionDrag}
            onDragLeave={handleDistortionDrag}
            onDragOver={handleDistortionDrag}
            onDrop={handleDistortionDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-blue-50 rounded-full">
                <BsCameraVideo size="2.5rem" className="text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-700">
                  Upload Video for Face Distortion Analysis
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  We'll analyze facial features and detect distortions
                </p>
              </div>
              <button
                onClick={() => distortionVideoRef.current?.click()}
                className="px-6 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Select Video
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-700">Video Preview</h3>
              <button 
                onClick={() => {
                  URL.revokeObjectURL(distortionFile.url);
                  setDistortionFile(null);
                  setDistortionData(null);
                }}
                className="p-2 hover:bg-red-50 rounded-full transition-colors"
              >
                <BsTrash size="1.25rem" className="text-red-500" />
              </button>
            </div>

            <video 
              src={distortionFile.url} 
              controls 
              className="w-full rounded-lg"
            />

            {!distortionData && (
              <button
                onClick={analyzeDistortions}
                disabled={analyzingDistortions}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
              >
                {analyzingDistortions ? 'Analyzing Face Distortions...' : 'Analyze Face Distortions'}
              </button>
            )}

            {distortionData && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Total Frames Analyzed</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">
                        {distortionData.total_frames}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Distorted Faces Detected</h4>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-blue-600">
                        {distortionData.distorted_faces}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Analysis Summary</h4>
                  <p className="text-gray-600">
                    {distortionData.distorted_faces > distortionData.total_frames * 0.5 
                      ? `High number of distorted faces detected (${distortionData.distorted_faces}). This suggests multiple faces in the video, with significant facial manipulations present.`
                      : distortionData.distorted_faces > distortionData.total_frames * 0.2
                      ? `Moderate level of face distortions detected (${distortionData.distorted_faces} frames). Some facial features show signs of manipulation.`
                      : `Low number of face distortions detected (${distortionData.distorted_faces} frames). The facial features appear mostly authentic.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={distortionVideoRef}
          type="file"
          accept="video/*"
          onChange={handleDistortionSelect}
          className="hidden"
        />
      </div>
    </div>
  );

  const renderVideoAnalysis = () => (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-10 shadow-2xl border border-blue-100">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <CircularProgressbar
                value={videoAnalysis?.confidence_score || 0}
                text={`${(videoAnalysis?.confidence_score || 0).toFixed(1)}%`}
                styles={buildStyles({
                  pathColor: videoAnalysis?.risk_level === 'High' ? '#ef4444' : '#22c55e',
                  textColor: videoAnalysis?.risk_level === 'High' ? '#ef4444' : '#22c55e',
                  trailColor: '#f3f4f6',
                  textSize: '16px',
                  pathTransitionDuration: 0.5
                })}
              />
              {videoAnalysis?.risk_level === 'High' && (
                <div className="absolute -top-2 -right-2 animate-pulse">
                  <AiOutlineWarning className="text-2xl text-red-500" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {videoAnalysis?.analysis_result || 'Analysis Complete'}
              </h2>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium
                  ${videoAnalysis?.risk_level === 'High' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'}`}>
                  {videoAnalysis?.risk_level || 'Low'} Risk
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={generateReport}
            className="group relative px-8 py-3 bg-blue-600 rounded-xl text-white font-medium shadow-lg hover:bg-blue-700 transition-all duration-300"
          >
            <span className="relative flex items-center gap-2">
              <FiDownload className="text-xl" />
              Export Report
            </span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl border border-blue-100">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-700">Frame Analysis</h3>
              <BsCameraVideo className="text-blue-500 text-xl" />
            </div>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <CircularProgressbar
                value={videoAnalysis ? 
                  (videoAnalysis.abnormal_frames_detected / videoAnalysis.total_frames_processed * 100) || 0 
                  : 0
                }
                text={`${videoAnalysis?.abnormal_frames_detected || 0}`}
                styles={buildStyles({
                  pathColor: '#3b82f6',
                  textColor: '#3b82f6',
                  trailColor: '#f3f4f6',
                  textSize: '16px'
                })}
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">
                of {videoAnalysis?.total_frames_processed} frames show anomalies
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-xl border border-red-100">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-700">Face Analysis</h3>
              <BsImage className="text-red-500 text-xl" />
            </div>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <CircularProgressbar
                value={videoAnalysis?.detailed_scores?.face_quality_score || 0}
                text={`${videoAnalysis?.distorted_faces || 0}`}
                styles={buildStyles({
                  pathColor: '#ef4444',
                  textColor: '#ef4444',
                  trailColor: '#f3f4f6',
                  textSize: '16px'
                })}
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">distorted faces detected</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-white p-6 rounded-xl border border-yellow-100">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-700">Audio Sync</h3>
              <MdWaves className="text-yellow-500 text-xl" />
            </div>
            <div className="relative w-32 h-32 mx-auto mb-4">
              <CircularProgressbar
                value={videoAnalysis?.detailed_scores?.audio_visual_sync_score || 0}
                text={`${videoAnalysis?.mismatch_score?.toFixed(2) || '0.00'}`}
                styles={buildStyles({
                  pathColor: '#f59e0b',
                  textColor: '#f59e0b',
                  trailColor: '#f3f4f6',
                  textSize: '16px'
                })}
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">audio-visual mismatch score</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-white p-8 rounded-2xl mb-12">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BsShieldCheck className="text-blue-500" />
            Quality Analysis Scores
          </h3>
          <div className="grid grid-cols-3 gap-8">
            {[
              {
                label: "Audio-Visual Sync",
                score: videoAnalysis?.detailed_scores?.audio_visual_sync_score,
                color: "blue",
                icon: MdWaves
              },
              {
                label: "Face Quality",
                score: videoAnalysis?.detailed_scores?.face_quality_score,
                color: "green",
                icon: BsImage
              },
              {
                label: "Frame Quality",
                score: videoAnalysis?.detailed_scores?.frame_quality_score,
                color: "purple",
                icon: BsCameraVideo
              }
            ].map((item, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600">{item.label}</span>
                  <item.icon className={`text-${item.color}-500 text-xl`} />
                </div>
                <div className="w-24 h-24 mx-auto mb-4">
                  <CircularProgressbar
                    value={Math.max(0, Math.min(100, item.score || 0))}
                    text={`${item.score?.toFixed(1)}%`}
                    styles={buildStyles({
                      pathColor: `var(--${item.color}-500)`,
                      textColor: `var(--${item.color}-500)`,
                      trailColor: '#f3f4f6'
                    })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Detailed Insights</h3>
          <div className="grid grid-cols-1 gap-4">
            {videoAnalysis?.score_explanation && Object.entries(videoAnalysis.score_explanation).map(([key, value]) => (
              key !== 'weights_used' && (
                <div key={key} 
                  className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100 hover:shadow-md transition-all">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      {key.includes('audio') ? <MdWaves className="text-blue-500 text-xl" /> :
                       key.includes('face') ? <BsImage className="text-blue-500 text-xl" /> :
                       <BsCameraVideo className="text-blue-500 text-xl" />}
                    </div>
                    <p className="text-gray-700 leading-relaxed">{value}</p>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <h1 className="text-4xl font-bold text-blue-600 mb-6 text-center">
        DeepFake Detection Dashboard
      </h1>
      
      <div className="max-w-4xl mx-auto">
        {!filePreview ? (
          <div 
            className={`
              border-2 border-dashed rounded-2xl p-12
              ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-blue-200'}
              transition-all duration-300 ease-in-out
              hover:border-blue-400 hover:bg-blue-50/50
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center space-y-8">
              <div className="animate-bounce">
                <FiUploadCloud size="5rem" color="#3B82F6" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-700">
                  Drag and drop your file here
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or select a file type below
                </p>
              </div>

              <div className="flex gap-8 mt-8 justify-evenly">
                <div 
                  onClick={() => imageInputRef.current?.click()}
                  className="flex flex-col items-center p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer border border-blue-100 hover:border-blue-300"
                >
                  <BsImage size="2.5rem" color="#2563EB" />
                  <span className="mt-3 text-lg font-medium text-blue-600">Images</span>
                  <span className="text-sm text-gray-500 mt-1">JPG, PNG, GIF</span>
                </div>

                <div 
                  onClick={() => videoInputRef.current?.click()}
                  className="flex flex-col items-center p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer border border-blue-100 hover:border-blue-300"
                >
                  <BsCameraVideo size="2.5rem" color="#2563EB" />
                  <span className="mt-3 text-lg font-medium text-blue-600">Videos</span>
                  <span className="text-sm text-gray-500 mt-1">MP4, MOV, AVI</span>
                </div>

                
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-700">File Preview</h2>
                <button 
                  onClick={() => {
                    URL.revokeObjectURL(filePreview.url);
                    setFilePreview(null);
                  }}
                  className="p-2 hover:bg-red-50 rounded-full transition-colors"
                >
                  <BsTrash size="1.5rem" color="#EF4444" />
                </button>
              </div>

              <div className="flex justify-center mb-6">
                {filePreview.type === 'image' ? (
                  <img 
                    src={filePreview.url} 
                    alt="Preview" 
                    className="max-h-[400px] rounded-lg object-contain"
                    onError={(e) => console.error('Image loading error:', e)}
                  />
                ) : filePreview.type === 'video' && (
                  <video 
                    src={filePreview.url}
                    controls
                    className="max-h-[400px] rounded-lg"
                    onError={(e) => console.error('Video loading error:', e)}
                  />
                )}
              </div>

              {!analysisComplete && (
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Analyze {filePreview.type === 'image' ? 'Image' : filePreview.type === 'video' ? 'Video' : 'Audio'}
                </button>
              )}
            </div>
            
            {isAnalyzing && renderAnalyzing()}
            {analysisComplete && filePreview?.type === 'video' && renderVideoAnalysis()}
            {analysisComplete && filePreview?.type === 'image' && renderAnalysisResults()}
          </>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Upload your media file to check if it's a deepfake.
            <br />
            We support various image, video, and audio formats.
          </p>
        </div>
      </div>
      {/* Create a grid layout for the analysis sections */}
      <div className="mt-16 grid grid-cols-2 gap-8 max-w-[1400px] mx-auto">
        {/* Audio Analysis */}
        <div className="transform hover:scale-[1.02] transition-transform">
          {renderAudioSection()}
        </div>

        {/* Frame Analysis */}
        <div className="transform hover:scale-[1.02] transition-transform">
          {renderFrameSection()}
        </div>

        {/* Face Distortion Analysis */}
        <div className="transform hover:scale-[1.02] transition-transform">
          {renderDistortionSection()}
        </div>

        {/* Sentiment Analysis */}
        <div className="transform hover:scale-[1.02] transition-transform">
          {renderSentimentSection()}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;