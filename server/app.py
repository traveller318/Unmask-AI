from flask import Flask, request, jsonify
from transformers import pipeline
from PIL import Image
import io
import cv2
import numpy as np
import mediapipe as mp

app = Flask(__name__)

# Add root route
@app.route('/', methods=['GET'])
def hello():
    return jsonify({"message": "Hello, working!"})

# Load deepfake detection model
pipe = pipeline("image-classification", model="prithivMLmods/Deep-Fake-Detector-Model")

# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True)

def calculate_face_distortion(image):
    """Detects facial landmarks using MediaPipe FaceMesh and calculates distortion score."""
    image_rgb = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    results = face_mesh.process(image_rgb)

    if not results.multi_face_landmarks:
        return {"error": "No face detected"}

    distortions = []
    for face_landmarks in results.multi_face_landmarks:
        points = np.array([[lm.x, lm.y] for lm in face_landmarks.landmark])

        # Example: Eye symmetry and jaw symmetry calculations
        left_eye_dist = np.linalg.norm(points[133] - points[159])  # Right eye corner distances
        right_eye_dist = np.linalg.norm(points[362] - points[386])  # Left eye corner distances
        eye_symmetry = abs(left_eye_dist - right_eye_dist)

        jaw_left = np.linalg.norm(points[234] - points[152])
        jaw_right = np.linalg.norm(points[454] - points[152])
        jaw_symmetry = abs(jaw_left - jaw_right)

        distortion_score = eye_symmetry + jaw_symmetry

        distortions.append({
            "face_id": len(distortions) + 1,
            "eye_symmetry": round(eye_symmetry, 4),
            "jaw_symmetry": round(jaw_symmetry, 4),
            "distortion_score": round(distortion_score, 4)
        })

    return distortions

@app.route('/predict', methods=['POST'])
def detect_deepfake():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    image = Image.open(io.BytesIO(image_file.read())).convert("RGB")  # Read and convert image

    # Run inference
    result = pipe(image)

    # Extract highest probability prediction
    best_prediction = max(result, key=lambda x: x["score"])

    # Calculate face distortion
    distortion_data = calculate_face_distortion(image)

    response = {
        "predictions": result,  # All label scores
        "best_label": best_prediction["label"],  # Label with highest probability
        "best_score": best_prediction["score"],  # Highest confidence score
        "face_distortion": distortion_data  # Face distortion metrics
    }

    return jsonify(response)  # Return results as JSON

if __name__ == '__main__':
    print("🚀 Server is running at http://127.0.0.1:5000/")
    app.run(debug=True)
