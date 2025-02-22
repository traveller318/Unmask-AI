# analyze_video.py

import os
import numpy as np
import librosa
from moviepy import VideoFileClip
from transformers import Wav2Vec2Processor, Wav2Vec2Model
import torch
import mediapipe as mp
import cv2
import matplotlib.pyplot as plt
import json

# Cell 3: Define function to extract audio from video
def extract_audio(video_path, output_audio_path="temp_audio.wav"):
    video = VideoFileClip(video_path)
    video.audio.write_audiofile(output_audio_path, codec='pcm_s16le')
    return output_audio_path

# Cell 4: Define function to process audio using Wav2Vec2
def process_audio(audio_path):
    processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
    model = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base-960h")
    waveform, sample_rate = librosa.load(audio_path, sr=16000)
    inputs = processor(waveform, sampling_rate=sample_rate, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
    audio_embeddings = outputs.last_hidden_state.mean(dim=1).squeeze().numpy()
    return audio_embeddings

# Cell 5: Define function to extract visual features (lip movements)
def extract_visual_features(video_path):
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1)
    video = VideoFileClip(video_path)
    frames = [frame for frame in video.iter_frames()]
    lip_landmarks = []
    face_detection_success = 0
    for frame in frames:
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(frame_rgb)
        if results.multi_face_landmarks:
            face_detection_success += 1
            lip_points = [results.multi_face_landmarks[0].landmark[i] for i in range(0, 20)]
            lip_coords = [(p.x, p.y, p.z) for p in lip_points]
            lip_landmarks.append(np.array(lip_coords).flatten())
    if lip_landmarks:
        visual_embeddings = np.mean(lip_landmarks, axis=0)
    else:
        raise ValueError("No face detected in the video.")
    face_detection_rate = face_detection_success / len(frames)
    return visual_embeddings, face_detection_rate

# Cell 6: Define function to compute mismatch metrics
def compute_mismatch_metrics(audio_embeddings, visual_embeddings):
    # Normalize embeddings
    audio_embeddings = audio_embeddings / np.linalg.norm(audio_embeddings)
    # Pad visual embeddings to match audio embeddings size
    padded_visual_embeddings = np.pad(
        visual_embeddings,
        (0, audio_embeddings.shape[0] - visual_embeddings.shape[0]),
        mode='constant'
    )
    padded_visual_embeddings = padded_visual_embeddings / np.linalg.norm(padded_visual_embeddings)
    # Compute cosine similarity
    cosine_similarity = np.dot(audio_embeddings, padded_visual_embeddings)
    mismatch_score = 1 - cosine_similarity
    # Compute Euclidean distance
    euclidean_distance = np.linalg.norm(audio_embeddings - padded_visual_embeddings)
    return {
        "cosine_similarity": cosine_similarity,
        "mismatch_score": mismatch_score,
        "euclidean_distance": euclidean_distance
    }

# Cell 7: Main function to analyze video
def analyze_video(video_path):
    # Step 1: Extract audio from video
    audio_path = extract_audio(video_path)
    # Step 2: Process audio to get embeddings
    audio_embeddings = process_audio(audio_path)
    # Step 3: Extract visual features (lip movements)
    visual_embeddings, face_detection_rate = extract_visual_features(video_path)
    # Step 4: Compute mismatch metrics
    metrics = compute_mismatch_metrics(audio_embeddings, visual_embeddings)
    # Clean up temporary files
    if os.path.exists(audio_path):
        os.remove(audio_path)
    return metrics, face_detection_rate

