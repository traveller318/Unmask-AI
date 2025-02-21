from flask import Flask, request, jsonify
from transformers import pipeline
from PIL import Image
import io
import cv2
import numpy as np
import dlib

app = Flask(__name__)

# Load deepfake detection model
pipe = pipeline("image-classification", model="prithivMLmods/Deep-Fake-Detector-Model")

# Load dlib face detector and landmark predictor
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")  # Pre-trained model

def calculate_face_distortion(image):
    """Detects facial landmarks and calculates distortion score."""
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    faces = detector(gray)

    if len(faces) == 0:
        return {"error": "No face detected"}

    distortions = []
    for face in faces:
        landmarks = predictor(gray, face)
        
        # Convert landmarks to a NumPy array
        points = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(68)])

        # Compute facial symmetry (example: difference between left and right eye distances)
        left_eye_dist = np.linalg.norm(points[42] - points[45])  # Right eye corner distances
        right_eye_dist = np.linalg.norm(points[36] - points[39])  # Left eye corner distances
        eye_symmetry = abs(left_eye_dist - right_eye_dist)

        # Compute jaw asymmetry (example: left vs right jaw points)
        jaw_left = np.linalg.norm(points[0] - points[8])
        jaw_right = np.linalg.norm(points[16] - points[8])
        jaw_symmetry = abs(jaw_left - jaw_right)

        # Overall distortion score (higher means more distortion)
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
    app.run(debug=True)
