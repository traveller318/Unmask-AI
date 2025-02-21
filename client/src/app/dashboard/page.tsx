"use client";
import React, { useState, useRef } from 'react';
import { FiUploadCloud, FiDownload } from 'react-icons/fi';
import { BsImage, BsCameraVideo, BsTrash, BsShieldCheck, BsShieldX } from 'react-icons/bs';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { AiOutlineWarning } from 'react-icons/ai';
import {  MdWaves } from 'react-icons/md';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FilePreview {
  url: string;
  type: 'image' | 'video';
  file: File;
}

interface DeepfakeMetrics {
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

const DashboardPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [metrics, setMetrics] = useState<DeepfakeMetrics | null>(null);
  const [insights, setInsights] = useState<DetailedInsight[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
    
    if (!isImage && !isVideo) {
      alert('Please upload only image or video files');
      return;
    }

    const url = URL.createObjectURL(file);
    setFilePreview({
      url,
      type: isImage ? 'image' : 'video',
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

  const handleSubmit = () => {
    if (!filePreview) return;
    setIsAnalyzing(true);
    
    // Simulate analysis with timeout
    setTimeout(() => {
      setMetrics({
        faceDistortion: 65,
        lipSyncDeviation: 82,
        frameConsistency: 71,
        audioVideoMismatch: 78
      });
      setInsights([
        {
          title: "Facial Inconsistencies Detected",
          description: "Unusual artifacts around eye regions and facial boundaries suggest potential manipulation.",
          severity: "high"
        },
        {
          title: "Audio-Visual Sync Issues",
          description: "Significant misalignment between lip movements and speech patterns.",
          severity: "high"
        },
        {
          title: "Frame Transition Analysis",
          description: "Minor inconsistencies in frame-to-frame transitions detected.",
          severity: "medium"
        },
        {
          title: "Metadata Analysis",
          description: "File metadata shows signs of digital processing.",
          severity: "low"
        }
      ]);
      setIsAnalyzing(false);
      setAnalysisComplete(true);
    }, 3000);
  };

  const generateReport = async () => {
    if (!reportRef.current) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;

      // Add background pattern
      for (let i = 0; i < pageHeight; i += 10) {
        for (let j = 0; j < pageWidth; j += 10) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(j, i, 5, 5, 'F');
        }
      }

      // Header with gradient-like effect
      for (let i = 0; i < 40; i++) {
        pdf.setFillColor(30 - i/2, 41 - i/2, 59 - i/2);
        pdf.rect(0, i, pageWidth, 1, 'F');
      }

      // Header content
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('Deepfake Analysis Report', pageWidth / 2, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });

      // Score section with custom design
      const score = getDeepfakeScore();
      const scoreColor = getScoreColor(score);
      
      // Score circle
      const centerX = margin + 25;
      const centerY = 85;
      const radius = 15;
      
      pdf.setFillColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.circle(centerX, centerY, radius, 'F');
      pdf.setTextColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.setFontSize(16);
      pdf.text(`${score}%`, centerX, centerY + 1, { align: 'center' });

      // Score status with colored background
      pdf.setFillColor(hexToRGB(scoreColor, 0.1)[0], hexToRGB(scoreColor, 0.1)[1], hexToRGB(scoreColor, 0.1)[2]);
      pdf.roundedRect(margin + 50, 75, 100, 20, 3, 3, 'F');
      pdf.setTextColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.setFontSize(14);
      pdf.text(getScoreStatus(score), margin + 55, 87);

      // Metrics section with modern design
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(18);
      pdf.text('Analysis Metrics', margin, 120);

      // Add decorative line
      pdf.setDrawColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 125, pageWidth - margin, 125);

      // Enhanced metrics visualization
      const metricsData: Array<{ label: string; value: number }> = [
        { label: "Face Distortion", value: metrics?.faceDistortion || 0 },
        { label: "Lip-Sync Deviation", value: metrics?.lipSyncDeviation || 0 },
        { label: "Frame Consistency", value: metrics?.frameConsistency || 0 },
        { label: "Audio-Video Mismatch", value: metrics?.audioVideoMismatch || 0 }
      ];

      metricsData.forEach((metric, index) => {
        const y = 145 + (index * 30);
        const barWidth = 120;
        const barHeight = 12;
        const x = margin;

        // Metric box with shadow effect
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x - 2, y - 12, pageWidth - (2 * margin) + 4, 25, 2, 2, 'F');
        
        // Metric label with icon
        pdf.setTextColor(71, 85, 105);
        pdf.setFontSize(12);
        pdf.text(`${metric.label}`, x, y);

        // Progress bar background
        pdf.setFillColor(241, 245, 249);
        pdf.roundedRect(x + 80, y - 7, barWidth, barHeight, 2, 2, 'F');

        // Progress bar value
        const metricColor = getScoreColor(metric.value);
        const [r, g, b, a] = hexToRGB(metricColor, 0.8);
        pdf.setFillColor(r, g, b, a);
        pdf.roundedRect(x + 80, y - 7, (metric.value / 100) * barWidth, barHeight, 2, 2, 'F');

        // Value text with background
        pdf.setFillColor(hexToRGB(metricColor, 0.1)[0], hexToRGB(metricColor, 0.1)[1], hexToRGB(metricColor, 0.1)[2]);
        pdf.roundedRect(x + 210, y - 7, 25, barHeight, 2, 2, 'F');
        pdf.setTextColor(hexToRGB(metricColor)[0], hexToRGB(metricColor)[1], hexToRGB(metricColor)[2]);
        pdf.text(`${metric.value}%`, x + 215, y);
      });

      // Enhanced insights section
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(18);
      pdf.text('Detailed Insights', margin, 280);
      
      // Add decorative line
      pdf.setDrawColor(hexToRGB(scoreColor)[0], hexToRGB(scoreColor)[1], hexToRGB(scoreColor)[2]);
      pdf.line(margin, 285, pageWidth - margin, 285);

      insights.forEach((insight, index) => {
        const y = 300 + (index * 35);
        const insightColor = getScoreColor(
          insight.severity === 'high' ? 80 :
          insight.severity === 'medium' ? 65 : 40
        );

        // Insight box with colored border
        pdf.setDrawColor(hexToRGB(insightColor)[0], hexToRGB(insightColor)[1], hexToRGB(insightColor)[2]);
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin - 2, y - 12, pageWidth - (2 * margin) + 4, 30, 2, 2, 'FD');

        // Severity indicator
        pdf.setFillColor(hexToRGB(insightColor)[0], hexToRGB(insightColor)[1], hexToRGB(insightColor)[2]);
        pdf.circle(margin + 4, y, 2, 'F');

        // Title and description
        pdf.setTextColor(30, 41, 59);
        pdf.setFontSize(12);
        pdf.text(insight.title, margin + 10, y);
        pdf.setTextColor(71, 85, 105);
        pdf.setFontSize(10);
        pdf.text(insight.description, margin + 10, y + 10, {
          maxWidth: pageWidth - (2 * margin) - 15
        });
      });

      // Enhanced footer
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

      // Save PDF
      pdf.save(`Deepfake_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  // Helper function to convert hex to RGB with optional alpha
  const hexToRGB = (hex: string, alpha: number = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return alpha !== 1 ? [r, g, b, alpha] as const : [r, g, b] as const;
  };

  const getDeepfakeScore = () => {
    if (!metrics) return 0;
    return Math.round(
      (metrics.faceDistortion + metrics.lipSyncDeviation + 
       metrics.frameConsistency + metrics.audioVideoMismatch) / 4
    );
  };

  const getScoreColor = (score: number) => {
    if (score < 50) return '#22c55e'; // green
    if (score <= 75) return '#f59e0b'; // yellow
    return '#ef4444'; // red
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

  const renderMetricCard = (title: string, value: number, color: string) => (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all transform hover:scale-105 border border-gray-100">
      <div className="w-24 h-24 mx-auto mb-4 relative">
        <CircularProgressbar
          value={value}
          text={`${value}%`}
          styles={buildStyles({
            pathColor: color,
            textColor: color,
            trailColor: '#f3f4f6',
            pathTransitionDuration: 1
          })}
        />
        {value > 75 && (
          <div className="absolute top-0 right-0 -mr-2 -mt-2">
            <AiOutlineWarning className="text-red-500 text-xl" />
          </div>
        )}
      </div>
      <h3 className="text-center text-gray-700 font-medium">{title}</h3>
    </div>
  );

  const renderAnalysisResults = () => (
    <div className="space-y-8" ref={reportRef}>
      <div className="bg-white rounded-3xl p-10 shadow-2xl overflow-hidden border border-blue-100">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-12">
          <div className="relative">
            <div className="absolute -inset-1  rounded-lg blur opacity-25 animate-pulse" />
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
          
          {filePreview?.type === 'video' && (
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

        {/* Main Score Display */}
        <div className="flex items-center justify-between mb-16 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-8">
          <div className="relative w-40 h-40">
            {/* Ripple Effect */}
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
            <h3 className={`text-5xl font-bold mb-4 ${
              `text-[${getScoreColor(getDeepfakeScore())}]`
            }`}>
              {getScoreStatus(getDeepfakeScore())}
            </h3>
            <p className="text-gray-700 text-xl leading-relaxed">
              Our AI analysis indicates this content {getScoreDescription(getDeepfakeScore())}
            </p>
          </div>
        </div>

        {/* Metrics Wave Display */}
        <div className="relative mb-16">
          <div className="relative grid grid-cols-4 gap-4">
            {[
              { label: "Face Distortion", value: metrics?.faceDistortion || 0, color: '#3b82f6' },
              { label: "Lip-Sync Deviation", value: metrics?.lipSyncDeviation || 0, color: '#ef4444' },
              { label: "Frame Consistency", value: metrics?.frameConsistency || 0, color: '#22c55e' },
              { label: "Audio-Video Mismatch", value: metrics?.audioVideoMismatch || 0, color: '#f59e0b' }
            ].map((metric, index) => (
              <div key={index} className="bg-blue-50 rounded-xl p-6 group hover:bg-blue-100 transition-all duration-300">
                <div className="relative h-32 mb-4">
                  <div 
                    className="absolute inset-x-0 bottom-0 rounded-lg transition-all duration-700"
                    style={{
                      height: `${metric.value}%`,
                      backgroundColor: metric.color,
                      opacity: 0.2
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
                    <span className="text-3xl font-bold mb-2" style={{ color: metric.color }}>{metric.value}%</span>
                  </div>
                </div>
                <span className="block text-center text-gray-700 font-medium">{metric.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Section */}
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
              <div className="animate-bounce"></div>
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

              <div className="flex gap-8 mt-8 justify-evenly ">
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
                ) : (
                  <video 
                    src={filePreview.url} 
                    controls 
                    className="max-h-[400px] rounded-lg"
                  />
                )}
              </div>

              {!analysisComplete && (
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Analyze {filePreview.type === 'image' ? 'Image' : 'Video'}
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

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Upload your media file to check if it's a deepfake.
            <br />
            We support various image and video formats.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;