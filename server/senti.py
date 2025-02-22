#!/usr/bin/env python
# coding: utf-8

import subprocess
import sys
import cv2
from deepface import DeepFace
from moviepy import VideoFileClip
import numpy as np
import json

# Function to install required libraries if not installed
def install_packages():
    packages = ["deepface", "opencv-python", "moviepy"]
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + packages)
    except subprocess.CalledProcessError as e:
        print(f"Error installing packages: {e}")

# Install required packages
install_packages()

# Function to analyze sentiment from video frames
def analyze_video_sentiment(video_path):
    """
    Analyzes sentiment from facial expressions in a video.
    """
    try:
        # Load the video
        video = VideoFileClip(video_path)
        fps = video.fps  # Frames per second
        total_frames = int(video.fps * video.duration)  # Total number of frames
        
        print(f"Video loaded: {video.duration} seconds at {fps} FPS ({total_frames} total frames).")
        
        # Initialize variables to store sentiment results
        sentiment_scores = []
        
        # Process every frame in the video
        for i, frame in enumerate(video.iter_frames()):
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            try:
                # Analyze emotions using DeepFace
                result = DeepFace.analyze(frame_rgb, actions=['emotion'], enforce_detection=False)
                # Extract dominant emotion
                dominant_emotion = result[0]['dominant_emotion']
                sentiment_scores.append(dominant_emotion)
                print(f"Frame {i+1}/{total_frames}: Dominant Emotion = {dominant_emotion}")
            except Exception as e:
                print(f"Frame {i+1}/{total_frames}: No face detected or error - {e}")
        
        # Summarize sentiment results
        sentiment_summary = {}
        for emotion in sentiment_scores:
            sentiment_summary[emotion] = sentiment_summary.get(emotion, 0) + 1
        
        # Save results to JSON
        output_path = "./sentiment_summary.json"
        with open(output_path, 'w') as json_file:
            json.dump(sentiment_summary, json_file)
        print(f"Sentiment summary saved to {output_path}")
        return sentiment_summary
    except Exception as e:
        print(f"Error processing video: {e}")
        return {}
    """
    Analyzes sentiment from facial expressions in a video.
    """
    try:
        # Load the video
        video = VideoFileClip(video_path)
        fps = video.fps  # Frames per second
        duration = int(video.duration)
        
        print(f"Video loaded: {duration} seconds at {fps} FPS.")

        # Initialize variables to store sentiment results
        sentiment_scores = []

        # Process each frame (taking 1 frame per second for efficiency)
        for i, frame in enumerate(video.iter_frames(fps=1)):
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            try:
                # Analyze emotions using DeepFace
                result = DeepFace.analyze(frame_rgb, actions=['emotion'], enforce_detection=False)

                # Extract dominant emotion
                dominant_emotion = result[0]['dominant_emotion']
                sentiment_scores.append(dominant_emotion)

                print(f"Second {i+1}/{duration}: Dominant Emotion = {dominant_emotion}")

            except Exception as e:
                print(f"Second {i+1}/{duration}: No face detected or error - {e}")

        # Summarize sentiment results
        sentiment_summary = {}
        for emotion in sentiment_scores:
            sentiment_summary[emotion] = sentiment_summary.get(emotion, 0) + 1

        # Save results to JSON
        output_path = "./sentiment_summary.json"
        with open(output_path, 'w') as json_file:
            json.dump(sentiment_summary, json_file)

        print(f"Sentiment summary saved to {output_path}")

        return sentiment_summary

    except Exception as e:
        print(f"Error processing video: {e}")
        return {}

# Run analysis
if __name__ == "__main__":
    video_path = "./uploads/download_3.mp4"  # Change this to your video path
    analyze_video_sentiment(video_path)
