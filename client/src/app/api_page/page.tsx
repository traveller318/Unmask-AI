'use client'

import React from 'react'
import { IoArrowBackCircleOutline } from "react-icons/io5";

function APIDocumentation() {
  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <IoArrowBackCircleOutline
        onClick={() => window.location.href = "/"} 
        className=" mb-4 text-blue-500 hover:underline text-3xl cursor-pointer"
      >
      </IoArrowBackCircleOutline>
      <div className="max-w-4xl mx-auto bg-white backdrop-blur-3xl shadow-xl rounded-xl p-6 border border-white/30">
        <h1 className="text-4xl font-bold text-black mb-8">API Documentation</h1>
        
        {/* Introduction Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-black mb-4">Introduction</h2>
          <p className="text-gray-700 mb-4">
            Our API🔗 provides endpoints to rapidly🚀 analyze videos for potential deepfake detection🕵️. 
            It combines multiple analysis methods including face detection, frame analysis, 
            and audio-visual🔉📺 synchronization checks.
          </p>
        </section>

        {/* Endpoints Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-black mb-4">Endpoints</h2>
          
          {/* Analysis Endpoint */}
          <div className="mb-8">
            <h3 className="text-2xl font-medium text-black mb-2">Video Analysis</h3>
            <div className="shadow rounded-lg p-6">
              <div className=''>
                <div className="mb-4">
                  <span className="inline-block bg-blue-500 text-white px-2 py-1 rounded text-sm mr-2">POST</span>
                  <code className="text-black">POST /api/results</code>
                </div>
                <p className="text-black mb-4">Analyzes a video file for potential deepfake manipulation.</p>
              </div>
              <h4 className="font-medium text-black mb-2">Request Body</h4>
              <pre className="bg-blue-200 p-4 rounded-md mb-4">
                {JSON.stringify({
                  "video_url": "string (required)",
                  "analysis_type": "full | quick"
                }, null, 2)}
              </pre>

              <h4 className="font-medium text-black mb-2">Response</h4>
              <pre className="bg-blue-200 p-4 rounded-md">
                {JSON.stringify({
                  "total_frames": 25,
                  "distorted_faces": 0,
                  "total_frames_processed": 25,
                  "total_abnormal_frames_detected": 1,
                  "face_detection_rate": 100.0,
                  "cosine_similarity": -0.05,
                  "mismatch_score": 1.05,
                  "euclidean_distance": 1.45,
                  "analysis_result": "High mismatch detected",
                  "confidence_score": 63.17
                }, null, 2)}
              </pre>
            </div>
          </div>
        </section>

        {/* Error Codes Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-black mb-4">Error Codes</h2>
          <div className="bg-blue-200 shadow rounded-lg p-6">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-black">Code</th>
                  <th className="text-left py-2 text-black">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 text-black">400</td>
                  <td className="text-black">Bad Request - Invalid parameters</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-black">401</td>
                  <td className="text-black">Unauthorized - Invalid API key</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 text-black">404</td>
                  <td className="text-black">Not Found - Analysis not found</td>
                </tr>
                <tr>
                  <td className="py-2 text-black">500</td>
                  <td className="text-black">Internal Server Error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default APIDocumentation