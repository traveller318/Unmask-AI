import torch
import torchvision.models as models
import cv2
import numpy as np
from scipy.spatial.distance import cosine
from torchvision import transforms
from facenet_pytorch import MTCNN
from PIL import Image
import os
import librosa
from moviepy import VideoFileClip
from transformers import Wav2Vec2Processor, Wav2Vec2Model
import mediapipe as mp
import matplotlib.pyplot as plt
import json



device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# Define preprocessing transformations with smaller resolution
transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((112, 112)),  # Smaller input size for faster processing
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  # Normalize the image
])

# Function to preprocess a single frame
def preprocess_frame(frame):
    frame = transform(frame).unsqueeze(0)  # Add batch dimension
    return frame

# Load a smaller pre-trained model (e.g., MobileNet)
model = models.mobilenet_v2(pretrained=True)
model = torch.nn.Sequential(*list(model.children())[:-1])  # Remove the final classification layer
model.eval()

# Function to extract features from a frame using the pre-trained model
def extract_features(frame, model):
    with torch.no_grad():
        features = model(frame)
    return features.squeeze().numpy().flatten()  # Flatten the feature vector to 1D

# Threshold for anomaly detection (you may need to tune this based on your data)
ANOMALY_THRESHOLD = 0.85

# Function to calculate cosine similarity between two feature vectors
def cosine_similarity(vec1, vec2):
    return 1 - cosine(vec1, vec2)

# Function to detect frame anomalies and display only abnormal frames
def detect_frame_anomalies(video_path, skip_frames=5):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video at path {video_path}")
        return 0, 0

    prev_features = None
    frame_count = 0
    total_frames = 0
    abnormal_frames = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Skip frames to reduce processing load
        frame_count += 1
        if frame_count % skip_frames != 0:
            continue

        # Increment total frame count
        total_frames += 1

        # Preprocess the frame
        input_tensor = preprocess_frame(frame)

        # Extract features using the pre-trained model
        current_features = extract_features(input_tensor, model)

        # Compare with previous frame's features
        if prev_features is not None:
            similarity = cosine_similarity(prev_features, current_features)

            # Detect anomaly based on similarity threshold
            if similarity < ANOMALY_THRESHOLD:
                abnormal_frames += 1
                # Display the abnormal frame
                anomaly_status = "Anomaly Detected"
                color = (0, 0, 255)  # Red color for anomalies
                cv2.putText(frame, f"Status: {anomaly_status}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
                cv2.imshow("Frame", frame)
                cv2.waitKey(1)  # Wait for a short time to display the frame

        # Update previous features
        prev_features = current_features

    cap.release()
    cv2.destroyAllWindows()
    return total_frames, abnormal_frames

