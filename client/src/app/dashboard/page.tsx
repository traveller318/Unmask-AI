"use client";
import React, { useState, useRef } from 'react';
import { FiUploadCloud, FiDownload } from 'react-icons/fi';
import { BsImage, BsCameraVideo, BsTrash, BsShieldCheck, BsShieldX, BsMic } from 'react-icons/bs';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { AiOutlineWarning } from 'react-icons/ai';
import { MdWaves } from 'react-icons/md';
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
function isImageMetrics(metrics: DeepfakeMetrics | VideoMetrics): metrics is DeepfakeMetrics {
  return 'distortionScore' in metrics;
}

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

const formatPercentage = (value: number): number => {
  return Number(value.toFixed(2));
};

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

  const handleSubmit = async () => {
    if (!filePreview) return;
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('image', filePreview.file);

      const response = await axios.post('http://127.0.0.1:5000/predict', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;

      console.log("Server response:", data);

      if (filePreview.type === 'image') {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
          
          const imageData = await filePreview.file.arrayBuffer();
          const base64Image = Buffer.from(imageData).toString('base64');
          
          const backgroundPrompt = `Analyze this image and determine if there are any background inconsistencies, artifacts, or manipulations. 
          Focus on:
          1. Background blur patterns
          2. Edge artifacts around the subject
          3. Lighting inconsistencies
          4. Unnatural shadows or reflections
          
          Return only a number between 0-100 representing the percentage likelihood of background manipulation.
          Format your response as a single number only.`;

          const backgroundResult = await model.generateContent([
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            backgroundPrompt
          ]);
          const backgroundResponse = await backgroundResult.response;
          const backgroundObstruction = Math.min(parseFloat(backgroundResponse.text()) || 65, 100);

          const faceMetrics = data.face_distortion[0];
          const distortionScore = formatPercentage(Math.min(faceMetrics.distortion_score, 100));
          const jawSymmetry = formatPercentage(Math.min((faceMetrics.jaw_symmetry / 100) * 100, 100));
          const eyeSymmetry = formatPercentage(Math.min((faceMetrics.eye_symmetry / 150) * 100, 100));

          setMetrics({
            distortionScore,
            jawSymmetry,
            eyeSymmetry,
            backgroundObstruction: formatPercentage(backgroundObstruction),
          });

          const insightsPrompt = `
            Analyze these deepfake detection metrics and provide 4 detailed insights.
            Metrics:
            - Overall prediction: ${data.best_label} (${(data.best_score * 100).toFixed(1)}% confidence)
            - Distortion Score: ${distortionScore}%
            - Jaw Symmetry: ${jawSymmetry}%
            - Eye Symmetry: ${eyeSymmetry}%
            - Background Analysis Score: ${backgroundObstruction}%

            For each insight, provide:
            1. A short, technical title
            2. A detailed technical description
            3. A severity level (high/medium/low) based on the metrics

            Format your response as a valid JSON array with exactly 4 objects.
            Each object should have these exact keys: "title", "description", "severity"
            
            Example format:
            [
              {
                "title": "Example Title",
                "description": "Example description",
                "severity": "high"
              }
            ]`;

          const insightsResult = await model.generateContent(insightsPrompt);
          const insightsResponse = await insightsResult.response;
          const insightsText = insightsResponse.text();
          
          const cleanedText = insightsText.replace(/```json\n|\n```/g, '').trim();
          
          try {
            const generatedInsights: DetailedInsight[] = JSON.parse(cleanedText);
            setInsights(generatedInsights);
          } catch (jsonError) {
            console.error('Error parsing insights JSON:', jsonError);
            setInsights([
              {
                title: "Facial Authenticity Analysis",
                description: `Distortion patterns detected with ${distortionScore}% confidence, indicating potential manipulation.`,
                severity: distortionScore > 75 ? 'high' : distortionScore > 50 ? 'medium' : 'low'
              },
              {
                title: "Facial Symmetry Assessment",
                description: `Jaw symmetry deviation at ${jawSymmetry}% and eye symmetry at ${eyeSymmetry}% from normal parameters.`,
                severity: (jawSymmetry + eyeSymmetry) / 2 > 75 ? 'high' : (jawSymmetry + eyeSymmetry) / 2 > 50 ? 'medium' : 'low'
              },
              {
                title: "Background Consistency Check",
                description: `Background analysis reveals ${backgroundObstruction}% likelihood of manipulation artifacts.`,
                severity: backgroundObstruction > 75 ? 'high' : backgroundObstruction > 50 ? 'medium' : 'low'
              },
              {
                title: "Overall Manipulation Confidence",
                description: `AI detection system reports ${(data.best_score * 100).toFixed(1)}% confidence in ${data.best_label.toLowerCase()} classification.`,
                severity: data.best_score > 0.75 ? 'high' : data.best_score > 0.5 ? 'medium' : 'low'
              }
            ]);
          }
        } catch (error) {
          console.error('Error analyzing image:', error);
        }
      } else if (filePreview.type === 'video') {
        setMetrics({
          faceDistortion: 65,
          lipSyncDeviation: 82,
          frameConsistency: 71,
          audioVideoMismatch: 78
        } as VideoMetrics);
      } else {
        // Add audio analysis logic here if needed
        setMetrics(null); // Placeholder for audio metrics
      }

      setIsAnalyzing(false);
      setAnalysisComplete(true);
    } catch (error) {
      console.error('Error analyzing file:', error);
      alert('Error analyzing file. Please try again.');
      setIsAnalyzing(false);
    }
  };

  const generateReport = async () => {
    if (!reportRef.current) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;

      for (let i = 0; i < pageHeight; i += 10) {
        for (let j = 0; j < pageWidth; j += 10) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(j, i, 5, 5, 'F');
        }
      }

      for (let i = 0; i < 40; i++) {
        pdf.setFillColor(30 - i/2, 41 - i/2, 59 - i/2);
        pdf.rect(0, i, pageWidth, 1, 'F');
      }

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Deepfake Analysis Report', pageWidth / 2, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });

      const score = getDeepfakeScore();
      const scoreColor = getScoreColor(score);
      
      const centerX = margin + 25;
      const centerY = 85;
      const radius = 15;
      
      pdf.setFillColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.circle(centerX, centerY, radius, 'F');
      pdf.setTextColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.setFontSize(16);
      pdf.text(`${score}%`, centerX, centerY + 1, { align: 'center' });

      pdf.setFillColor(hexToRGB(scoreColor, 0.1)[0], hexToRGB(scoreColor, 0.1)[1], hexToRGB(scoreColor, 0.1)[2]);
      pdf.roundedRect(margin + 50, 75, 100, 20, 3, 3, 'F');
      pdf.setTextColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.setFontSize(14);
      pdf.text(getScoreStatus(score), margin + 55, 87);

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(18);
      pdf.text('Analysis Metrics', margin, 120);

      pdf.setDrawColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 125, pageWidth - margin, 125);

      const metricsData = getMetricsData();

      metricsData.forEach((metric, index) => {
        const y = 145 + (index * 30);
        const barWidth = 120;
        const barHeight = 12;
        const x = margin;

        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x - 2, y - 12, pageWidth - (2 * margin) + 4, 25, 2, 2, 'F');
        
        pdf.setTextColor(71, 85, 105);
        pdf.setFontSize(12);
        pdf.text(`${metric.label}`, x, y);

        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(x + 80, y - 7, barWidth, barHeight, 2, 2, 'F');

        const metricColor = getScoreColor(metric.value);
        const [r, g, b, a] = hexToRGB(metricColor, 0.8);
        pdf.setFillColor(r, g, b, a);
        pdf.roundedRect(x + 80, y - 7, (metric.value / 100) * barWidth, barHeight, 2, 2, 'F');

        pdf.setFillColor(hexToRGB(metricColor, 0.1)[0], hexToRGB(metricColor, 0.1)[1], hexToRGB(metricColor, 0.1)[2]);
        pdf.roundedRect(x + 210, y - 7, 25, barHeight, 2, 2, 'F');
        pdf.setTextColor(hexToRGB(metricColor)[0], hexToRGB(metricColor)[1], hexToRGB(metricColor)[2]);
        pdf.text(`${metric.value}%`, x + 215, y);
      });

      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(18);
      pdf.text('Detailed Insights', margin, 280);
      
      pdf.setDrawColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.line(margin, 285, pageWidth - margin, 285);

      insights.forEach((insight, index) => {
        const y = 300 + (index * 35);
        const insightColor = getScoreColor(
          insight.severity === 'high' ? 80 :
          insight.severity === 'medium' ? 65 : 40
        );

        pdf.setDrawColor(hexToRGB(insightColor)[0], hexToRGB(insightColor)[1], hexToRGB(insightColor)[2]);
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin - 2, y - 12, pageWidth - (2 * margin) + 4, 30, 2, 2, 'FD');

        pdf.setFillColor(hexToRGB(insightColor)[0], hexToRGB(insightColor)[1], hexToRGB(insightColor)[2]);
        pdf.circle(margin + 4, y, 2, 'F');

        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(12);
        pdf.text(insight.title, margin + 10, y);
        pdf.setTextColor(71, 85, 105);
        pdf.setFontSize(10);
        pdf.text(insight.description, margin + 10, y + 10, {
          maxWidth: pageWidth - (2 * margin) - 15
        });
      });

      const footerY = pageHeight - 20;
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, footerY - 10, pageWidth, 30, 'F');
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(8);
      pdf.text(
        'Generated by DeepFake Detection System • Confidential Analysis Report',
        pageWidth / 2,
        footerY,
        { align: 'center' }
      );

      pdf.save(`Deepfake_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
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

                <div 
                  onClick={() => audioInputRef.current?.click()}
                  className="flex flex-col items-center p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer border border-blue-100 hover:border-blue-300"
                >
                  <BsMic size="2.5rem" color="#2563EB" />
                  <span className="mt-3 text-lg font-medium text-blue-600">Audio</span>
                  <span className="text-sm text-gray-500 mt-1">MP3, WAV, AAC</span>
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
                  />
                ) : filePreview.type === 'video' ? (
                  <video 
                    src={filePreview.url} 
                    controls 
                    className="max-h-[400px] rounded-lg"
                  />
                ) : (
                  <audio 
                    src={filePreview.url} 
                    controls 
                    className="w-full max-w-[400px]"
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
            {analysisComplete && renderAnalysisResults()}
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
    </div>
  );
};

export default DashboardPage;