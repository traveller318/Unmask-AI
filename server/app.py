from flask import Flask, request, jsonify
from transformers import pipeline
from PIL import Image
import io
import cv2
import numpy as np
import mediapipe as mp
import nbformat
from nbconvert import PythonExporter
from flask_cors import CORS
import os
from senti import analyze_video_sentiment  # Ensure this function works properly
from audio import analyze_video
# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Debugging: Print when server starts
print("🚀 Server is running at http://127.0.0.1:5000/")

# Load deepfake detection model
pipe = pipeline("image-classification", model="prithivMLmods/Deep-Fake-Detector-Model")

# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

# Create a temporary directory to store uploaded files
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route("/", methods=["GET"])
def hello():
    return jsonify({"message": "Hello, working!"})


# ----------- FIXED VIDEO ANALYSIS AUDIO -------------
@app.route("/analyze_audio", methods=["POST"])
def analyze_audio_vid():
    print("DEBUG: Received request to /analyze_audio")

    if "video" not in request.files:
        print("DEBUG: No file received in request.files")
        return jsonify({"error": "No video uploaded"}), 400

    video_file = request.files["video"]
    print(f"DEBUG: Received video file: {video_file.filename}")

    # Save the file temporarily
    video_path = os.path.join(UPLOAD_FOLDER, video_file.filename)
    video_file.save(video_path)
    print(f"DEBUG: Video saved to {video_path}")

    # Process video using analyze_video_sentiment
    try:
        result = analyze_video(video_path)
        print("DEBUG: Audio analysis successful")
        return jsonify(result)
    except Exception as e:
        print(f"ERROR: Audio analysis failed - {e}")
        return jsonify({"error": "Failed to analyze video"}), 500


# ----------- FIXED VIDEO ANALYSIS ROUTE -------------
@app.route("/analyze_sentiment", methods=["POST"])
def analyze_sentiment():
    print("DEBUG: Received request to /analyze_sentiment")

    if "video" not in request.files:
        print("DEBUG: No file received in request.files")
        return jsonify({"error": "No video uploaded"}), 400

    video_file = request.files["video"]
    print(f"DEBUG: Received video file: {video_file.filename}")

    # Save the file temporarily
    video_path = os.path.join(UPLOAD_FOLDER, video_file.filename)
    video_file.save(video_path)
    print(f"DEBUG: Video saved to {video_path}")

    # Process video using analyze_video_sentiment
    try:
        result = analyze_video_sentiment(video_path)
        print("DEBUG: Sentiment analysis successful")
        return jsonify(result)
    except Exception as e:
        print(f"ERROR: Sentiment analysis failed - {e}")
        return jsonify({"error": "Failed to analyze video"}), 500


# ----------- DEEPFAKE DETECTION -------------
def convert_to_jpg(image):
    """Convert image to JPG format while preserving quality"""
    if image.format != "JPEG":
        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
        if image.mode == "RGBA":
            rgb_image.paste(image, mask=image.split()[3])
        else:
            rgb_image.paste(image)

        jpg_buffer = io.BytesIO()
        rgb_image.save(jpg_buffer, format="JPEG", quality=95)
        jpg_buffer.seek(0)
        return Image.open(jpg_buffer)
    return image


def calculate_face_distortion(image):
    """Detects facial landmarks and calculates distortion score."""
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    results = face_mesh.process(image_cv)

    if not results.multi_face_landmarks:
        return {"error": "No face detected"}

    distortions = []
    for face_landmarks in results.multi_face_landmarks:
        points = np.array(
            [
                [lm.x * image_cv.shape[1], lm.y * image_cv.shape[0]]
                for lm in face_landmarks.landmark
            ]
        )

        try:
            left_eye = np.mean(points[133:144], axis=0)
            right_eye = np.mean(points[362:373], axis=0)
            eye_symmetry = np.linalg.norm(left_eye - right_eye)

            jaw_left = np.mean(points[234:240], axis=0)
            jaw_right = np.mean(points[454:460], axis=0)
            jaw_symmetry = np.linalg.norm(jaw_left - jaw_right)

            distortion_score = (eye_symmetry + jaw_symmetry) / 2
            max_expected_distortion = 100
            normalized_score = min(
                (distortion_score / max_expected_distortion) * 100, 100
            )

            distortions.append(
                {
                    "face_id": len(distortions) + 1,
                    "eye_symmetry": round(eye_symmetry, 4),
                    "jaw_symmetry": round(jaw_symmetry, 4),
                    "distortion_score": round(normalized_score, 2),
                }
            )
        except IndexError:
            return {"error": "Failed to calculate facial metrics"}

    return distortions


@app.route("/predict", methods=["POST"])
def detect_deepfake():
    print("DEBUG: Received request to /predict")

    if "image" not in request.files:
        print("DEBUG: No image received in request.files")
        return jsonify({"error": "No image uploaded"}), 400

    image_file = request.files["image"]
    print(f"DEBUG: Received image file: {image_file.filename}")

    original_image = Image.open(io.BytesIO(image_file.read()))
    image = convert_to_jpg(original_image)

    result = pipe(image)
    best_prediction = max(result, key=lambda x: x["score"])
    distortion_data = calculate_face_distortion(image)

    response = {
        "predictions": result,
        "best_label": best_prediction["label"],
        "best_score": best_prediction["score"],
        "face_distortion": distortion_data,
        "image_format": "JPEG",
    }

    return jsonify(response)


# ----------- RUN FLASK APP -------------
if __name__ == "__main__":
    app.run(debug=True)
