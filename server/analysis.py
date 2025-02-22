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
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError

# Import your existing functions from the scripts
from face import detect_face_distortion
from frame import detect_frame_anomalies
from audio import analyze_video

def run_with_timeout(func, args, timeout):
    """Run a function with a timeout using ThreadPoolExecutor"""
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(func, *args)
        try:
            return future.result(timeout=timeout)
        except TimeoutError:
            # Cleanup any resources before raising timeout
            if 'video_path' in args:
                try:
                    import cv2
                    cv2.destroyAllWindows()
                except:
                    pass
            raise TimeoutException("Analysis timed out")

class TimeoutException(Exception):
    pass

def process_video_internal(video_path):
    """Internal function to process video without timeout handling"""
    # Initialize results dictionary
    results = {}
    start_time = time.time()

    # Increase frame skipping for faster processing
    skip_frames = 10  # Changed from 5 to 10

    # Step 1: Detect face distortion (total frames, distorted faces)
    total_frames, distorted_faces = detect_face_distortion(video_path, skip_frames=skip_frames)
    results['total_frames'] = total_frames
    results['distorted_faces'] = distorted_faces

    # Step 2: Detect frame anomalies
    total_frames_processed, abnormal_frames_detected = detect_frame_anomalies(video_path, skip_frames=skip_frames)
    results['total_frames_processed'] = total_frames_processed
    results['abnormal_frames_detected'] = abnormal_frames_detected

     # Step 3: Analyze video for audio-visual mismatch
    try:
        metrics, face_detection_rate = analyze_video(video_path)
        results['face_detection_rate'] = face_detection_rate
        results['cosine_similarity'] = metrics['cosine_similarity']
        results['mismatch_score'] = metrics['mismatch_score']
        results['euclidean_distance'] = metrics['euclidean_distance']
    except Exception as e:
        print(f"Error in audio analysis: {str(e)}")
        results['audio_analysis_error'] = str(e)
        results['face_detection_rate'] = 0
        results['cosine_similarity'] = 0
        results['mismatch_score'] = 1
        results['euclidean_distance'] = 1

    # Calculate scores
    distorted_face_ratio = distorted_faces / max(total_frames, 1)
    abnormal_frame_ratio = abnormal_frames_detected / max(total_frames_processed, 1)

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

       # Calculate individual scores (0-100 scale)
    face_score = 100 * (1 - distorted_face_ratio) * results.get('face_detection_rate', 0)
    frame_score = 100 * (1 - abnormal_frame_ratio)
    
    # Audio-visual sync score
    av_sync_score = 100 * (
        0.4 * results.get('cosine_similarity', 0) +
        0.4 * (1 - results.get('mismatch_score', 1)) +
        0.2 * (1 - results.get('euclidean_distance', 1))
    )

    # Store individual scores for detailed analysis
    results['detailed_scores'] = {
        'face_quality_score': round(face_score, 2),
        'frame_quality_score': round(frame_score, 2),
        'audio_visual_sync_score': round(av_sync_score, 2)
    }

    # Dynamic weights based on detection quality
    face_weight = 0.5 if results.get('face_detection_rate', 0) > 0.5 else 0.3
    frame_weight = 0.3
    av_weight = 0.2 if results.get('face_detection_rate', 0) > 0.5 else 0.4

    # Calculate final confidence score
    confidence_score = (
        face_weight * face_score +
        frame_weight * frame_score +
        av_weight * av_sync_score
    )

    # Ensure confidence score is within [0, 100]
    results['confidence_score'] = round(max(0, min(100, confidence_score)), 2)

    # More detailed analysis result
    if confidence_score > 80:
        results['analysis_result'] = "Very likely authentic content (>80% confidence)"
        results['risk_level'] = "Low"
    elif confidence_score > 65:
        results['analysis_result'] = "Probably authentic content (65-80% confidence)"
        results['risk_level'] = "Low-Medium"
    elif confidence_score > 45:
        results['analysis_result'] = "Uncertain authenticity (45-65% confidence)"
        results['risk_level'] = "Medium"
    elif confidence_score > 30:
        results['analysis_result'] = "Likely manipulated content (30-45% confidence)"
        results['risk_level'] = "Medium-High"
    else:
        results['analysis_result'] = "Very likely manipulated content (<30% confidence)"
        results['risk_level'] = "High"

    # Add explanation of scores
    results['score_explanation'] = {
        'face_analysis': f"Face quality score: {round(face_score, 2)}% - Based on face detection and distortion analysis",
        'frame_analysis': f"Frame quality score: {round(frame_score, 2)}% - Based on frame anomaly detection",
        'audio_sync': f"Audio-visual sync score: {round(av_sync_score, 2)}% - Based on lip sync and audio analysis",
        'weights_used': {
            'face_weight': face_weight,
            'frame_weight': frame_weight,
            'audio_visual_weight': av_weight
        }
    }

    processing_time = time.time() - start_time
    results['processing_time'] = round(processing_time, 2)
    return results

def process_video(video_path):
    """Main function to process video with timeout handling"""
    try:
        # Validate video file exists
        if not os.path.exists(video_path):
            return {
                'error': 'Video file not found',
                'status': 'failed',
                'confidence_score': 0,
                'analysis_result': 'Analysis failed - file not found'
            }

        # Check file size
        file_size = os.path.getsize(video_path) / (1024 * 1024)  # Size in MB
        if file_size > 100:  # If file is larger than 100MB
            return {
                'error': 'Video file too large (max 100MB)',
                'status': 'failed',
                'confidence_score': 0,
                'analysis_result': 'Analysis failed - file too large'
            }

        # Increase timeout to 90 seconds for larger files
        timeout = 90 if file_size > 50 else 60
        
        # Run analysis
        results = run_with_timeout(process_video_internal, [video_path], timeout)
        
        # Cleanup
        try:
            cv2.destroyAllWindows()
        except:
            pass
            
        return results

    except TimeoutException as e:
        print("Analysis timed out")
        # Cleanup
        try:
            cv2.destroyAllWindows()
        except:
            pass
        return {
            'error': f'Analysis timed out after {timeout} seconds',
            'status': 'failed',
            'confidence_score': 0,
            'analysis_result': 'Analysis failed due to timeout'
        }
    except Exception as e:
        print(f"Error in process_video: {str(e)}")
        # Cleanup
        try:
            cv2.destroyAllWindows()
        except:
            pass
        return {
            'error': str(e),
            'status': 'failed',
            'confidence_score': 0,
            'analysis_result': 'Analysis failed due to technical error'
        }
    finally:
        # Additional cleanup
        try:
            import gc
            gc.collect()
            torch.cuda.empty_cache()  # If using GPU
        except:
            pass