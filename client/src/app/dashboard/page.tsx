"use client";
import React, { useState, useRef } from 'react';
import { FiUploadCloud } from 'react-icons/fi';
import { BsImage, BsCameraVideo, BsTrash } from 'react-icons/bs';

interface FilePreview {
  url: string;
  type: 'image' | 'video';
  file: File;
}

const DashboardPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
    // Add your submission logic here
    console.log(`Submitting ${filePreview.type}:`, filePreview.file);
  };

  const clearPreview = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview.url);
      setFilePreview(null);
    }
  };

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
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-700">File Preview</h2>
              <button 
                onClick={clearPreview}
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

            <button
              onClick={handleSubmit}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Submit {filePreview.type === 'image' ? 'Image' : 'Video'}
            </button>
          </div>
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