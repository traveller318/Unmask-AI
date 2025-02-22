import os
import json
import torch
import cv2
import numpy as np
from facenet_pytorch import MTCNN
from torchvision import transforms
from scipy.spatial.distance import cosine
from moviepy import VideoFileClip
from transformers import Wav2Vec2Processor, Wav2Vec2Model
import mediapipe as mp
import librosa

# Import your existing functions from the scripts
from face import detect_face_distortion
from frame import detect_frame_anomalies
from audio import analyze_video

def process_video(video_path):
    # Initialize results dictionary
    results = {}

    # Step 1: Detect face distortion (total frames, distorted faces)
    total_frames, distorted_faces = detect_face_distortion(video_path, skip_frames=5)
    results['total_frames'] = total_frames
    results['distorted_faces'] = distorted_faces

    # Step 2: Detect frame anomalies (total frames processed, abnormal frames detected)
    total_frames_processed, abnormal_frames_detected = detect_frame_anomalies(video_path, skip_frames=5)
    results['total_frames_processed'] = total_frames_processed
    results['abnormal_frames_detected'] = abnormal_frames_detected

    # Step 3: Analyze video for audio-visual mismatch (cosine similarity, mismatch score, Euclidean distance, face detection rate)
    metrics, face_detection_rate = analyze_video(video_path)
    results['face_detection_rate'] = face_detection_rate
    results['cosine_similarity'] = metrics['cosine_similarity']
    results['mismatch_score'] = metrics['mismatch_score']
    results['euclidean_distance'] = metrics['euclidean_distance']

    # Step 4: Determine analysis result based on mismatch score
    if metrics['mismatch_score'] < 0.5:
        analysis_result = "Audio and visual content are well-aligned."
    elif 0.5 <= metrics['mismatch_score'] < 0.7:
        analysis_result = "Potential audio-visual misalignment detected."
    else:
        analysis_result = "Significant audio-visual misalignment detected."

    results['analysis_result'] = analysis_result
    distorted_face_ratio = distorted_faces / max(total_frames, 1)  # Avoid division by zero
    abnormal_frame_ratio = abnormal_frames_detected / max(total_frames_processed, 1)  # Avoid division by zero

    # Face Quality Factor
    face_quality_factor = (1 - distorted_face_ratio) * face_detection_rate

    # Frame Anomaly Factor
    frame_anomaly_factor = 1 - abnormal_frame_ratio

    # Audio-Visual Alignment Factor
    audio_visual_alignment_factor = (
        metrics['cosine_similarity'] +
        (1 - metrics['mismatch_score']) +
        (1 - metrics['euclidean_distance'])
    ) / 3
    w1, w2, w3 = 0.4, 0.3, 0.3

    # Confidence Score
    confidence_score = 100 * (
        w1 * face_quality_factor +
        w2 * frame_anomaly_factor +
        w3 * audio_visual_alignment_factor
    )

    # Ensure confidence score is within [0, 100]
    confidence_score = max(0, min(100, confidence_score))

    results['confidence_score'] = confidence_score

    return results