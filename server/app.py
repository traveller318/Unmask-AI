from flask import Flask, request, jsonify
from transformers import pipeline
from PIL import Image
import io
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
import os
import cv2
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from keras.models import load_model
from werkzeug.utils import secure_filename


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

# Allowed file extensions for videos
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

# Meso4 Model Class
class Meso4:
    def __init__(self, model_path, weights_path):
        # Load the model architecture (.keras) and weights (.h5)
        self.model = load_model(model_path)  # Load the pre-trained model
        self.model.load_weights(weights_path)  # Load weights from .h5 file
        self.model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )

    def predict_frame(self, frame):
        # Preprocess the frame (resize, normalize, etc.)
        frame_resized = tf.image.resize(frame, (112, 112))  # Resize to match model input
        frame_resized = frame_resized / 255.0  # Normalize
        frame_resized = np.expand_dims(frame_resized, axis=0)  # Add batch dimension
        
        prediction = self.model.predict(frame_resized)
        return prediction[0][0]

    def process_video(self, video_path):
        # Open video
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print("Error: Could not open video file.")
            return []

        deepfake_count = 0
        total_frames = 0
        predictions = []

        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Failed to read a frame or end of video.")
                break  # Break out of the loop if no more frames are read

            total_frames += 1
            print(f"Processing frame {total_frames}...")

            # Preprocess frame
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)  # Convert frame to RGB
            prediction = self.predict_frame(frame_rgb)

            predictions.append(prediction)

            if prediction > 0.7:
                deepfake_count += 1

        cap.release()

        if total_frames == 0:
            print("No frames were processed.")
            return []

        # Output the results
        print(f"Total Frames: {total_frames}")
        print(f"Deepfake Frames: {deepfake_count}")
        print(f"Non-Deepfake Frames: {total_frames - deepfake_count}")
        
        deepfake_percentage = (deepfake_count / total_frames) * 100
        print(f"Percentage of Deepfake Frames: {deepfake_percentage:.2f}%")
        
        return predictions

# Flask route to upload video and get predictions
@app.route('/upload_video', methods=['POST'])
def upload_video():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        # Secure the filename and save the file
        filename = secure_filename(file.filename)
        video_path = os.path.join('uploads', filename)
        file.save(video_path)
        
        # Process the video and get predictions
        predictions = model.process_video(video_path)
        
        # Calculate total deepfake percentage
        total_frames = len(predictions)
        deepfake_count = sum(1 for pred in predictions if pred > 0.5)
        deepfake_percentage = (deepfake_count / total_frames) * 100 if total_frames > 0 else 0

        return jsonify({
            'total_frames': total_frames,
            'deepfake_frames': deepfake_count,
            'non_deepfake_frames': total_frames - deepfake_count,
            'deepfake_percentage': deepfake_percentage
        }), 200
    else:
        return jsonify({'error': 'Invalid file type. Only MP4, AVI, MOV, MKV are allowed.'}), 400

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

if __name__ == '__main__':
    # Create uploads directory if it doesn't exist
    os.makedirs('uploads', exist_ok=True)
    
    # Load the pre-trained model and weights
    model = Meso4(
        model_path=r'C:\Users\Daksh\Desktop\thakur_hack_final\hackanova\Deepfake-detection\models\Meso4_DF_model.h5',
        weights_path=r'C:\Users\Daksh\Desktop\thakur_hack_final\hackanova\Deepfake-detection\models\Meso4_DF.weights.h5'
    )
    
    # Start Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)