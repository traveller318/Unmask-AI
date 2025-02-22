from flask import Flask, request, jsonify
from transformers import pipeline
from PIL import Image, ImageDraw, ImageFont
import cv2
import numpy as np
import mediapipe as mp
import nbformat
from nbconvert import PythonExporter
from flask_cors import CORS
import os
from senti import analyze_video_sentiment  # Ensure this function works properly
from audio import analyze_video
from frame import detect_frame_anomalies
from face import detect_face_distortion
from analysis import process_video
from werkzeug.utils import secure_filename
import logging
import io

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

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

# Add these configurations at the top of app.py after the imports
UPLOAD_FOLDER = '/tmp'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'wmv'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Add helper function to check allowed files
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/", methods=["GET"])
def hello():
    return jsonify({"message": "Hello, working!"})

# ----------- FACE DISTORTIONS ROUTE -------------

@app.route("/analyze_distortions", methods=["POST"])
def analyze_distortions():
    print("DEBUG: Received request to /analyze_distortions")

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
        result = detect_face_distortion(video_path)
        print("DEBUG: Audio analysis successful")
        return jsonify(result)
    except Exception as e:
        print(f"ERROR: Audio analysis failed - {e}")
        return jsonify({"error": "Failed to analyze video"}), 500


# ----------- VIDEO FRAME ANAMOLIES ROUTE -------------

@app.route("/analyze_frame", methods=["POST"])
def analyze_frame():
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
        result = detect_frame_anomalies(video_path)
        print("DEBUG: Audio analysis successful")
        return jsonify(result)
    except Exception as e:
        print(f"ERROR: Audio analysis failed - {e}")
        return jsonify({"error": "Failed to analyze video"}), 500

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

def add_ai_generated_text(image):
    """Overlay 'AI Generated' text on the image."""
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()  # Default font (you can change this)
    
    text = "AI Generated"
    text_position = (10, 10)  # Top-left corner
    text_color = (255, 0, 0)  # Red color
    
    draw.text(text_position, text, fill=text_color, font=font)
    return image


@app.route("/predict", methods=["POST"])
def detect_deepfake():
    print("DEBUG: Received request to /predict")

    if "image" not in request.files and "video" not in request.files:
        print("DEBUG: No image or video received in request.files")
        return jsonify({"error": "No media file uploaded"}), 400

    # Check if it's a video file
    if "video" in request.files:
        video_file = request.files["video"]
        allowed_extensions = {'mp4', 'avi', 'mov', 'mkv'}
        if not video_file.filename.lower().endswith(tuple(allowed_extensions)):
            return jsonify({"error": "Invalid video format"}), 400

        # Save video to temporary file
        temp_path = os.path.join('/tmp', video_file.filename)
        video_file.save(temp_path)

        try:
            # Process video
            results = process_video(temp_path)
            
            # Clean up temporary file
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Error removing temporary file: {str(e)}")

            return jsonify(results)

        except Exception as e:
            return jsonify({
                "error": str(e),
                "status": "failed",
                "confidence_score": 0,
                "analysis_result": "Analysis failed"
            }), 500

    # Handle image file

    image_file = request.files["image"]
    print(f"DEBUG: Received image file: {image_file.filename}")

     # Open image directly without conversion
    image = Image.open(io.BytesIO(image_file.read()))

    # Add "AI Generated" text to the image
    image = add_ai_generated_text(image)

    # Save the modified image to a buffer
    img_io = io.BytesIO()
    image.save(img_io, format=image.format or 'PNG')  # Use original format or PNG as fallback
    img_io.seek(0)

    result = pipe(image)
    best_prediction = max(result, key=lambda x: x["score"])
    distortion_data = calculate_face_distortion(image)

    response = {
        "predictions": result,
        "best_label": best_prediction["label"],
        "best_score": best_prediction["score"],
        "face_distortion": distortion_data,
        "image_format": image.format or 'PNG',
        "image": img_io.getvalue().hex()  # Co
    }

    return jsonify(response)

@app.route('/process_video', methods=['POST'])
def process_video_endpoint():
    try:
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file uploaded'}), 400

        video_file = request.files['video']
        
        # If no file selected
        if video_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # Check if file type is allowed
        if not allowed_file(video_file.filename):
            return jsonify({'error': 'File type not allowed. Please upload MP4, AVI, MOV, or WMV files.'}), 400

        # Secure the filename
        filename = secure_filename(video_file.filename)
        
        # Create temporary directory if it doesn't exist
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

        # Save the uploaded file temporarily
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        video_file.save(video_path)

        try:
            # Process video using our existing functions
            face_results = detect_face_distortion(video_path)
            frame_results = detect_frame_anomalies(video_path)
            audio_results, face_detection_rate = analyze_video(video_path)

            # Calculate overall metrics
            total_frames = frame_results[0]
            abnormal_frames = frame_results[1]
            
            # Calculate confidence score
            face_score = 100 * (1 - face_results[1]/face_results[0]) if face_results[0] > 0 else 0
            frame_score = 100 * (1 - abnormal_frames/total_frames) if total_frames > 0 else 0
            audio_score = 100 * (1 - audio_results['mismatch_score'])

            confidence_score = (face_score + frame_score + audio_score) / 3

            results = {
                'total_frames_processed': total_frames,
                'abnormal_frames_detected': abnormal_frames,
                'distorted_faces': face_results[1],
                'confidence_score': round(confidence_score, 2),
                'detailed_scores': {
                    'face_quality_score': round(face_score, 2),
                    'frame_quality_score': round(frame_score, 2),
                    'audio_visual_sync_score': round(audio_score, 2)
                },
                'mismatch_score': round(audio_results['mismatch_score'], 2),
                'risk_level': 'High' if confidence_score < 50 else 'Medium' if confidence_score < 75 else 'Low',
                'analysis_result': 'Likely manipulated' if confidence_score < 50 else 'Possibly authentic',
                'score_explanation': {
                    'face_analysis': f"Face quality score: {round(face_score, 2)}% - Based on facial distortion analysis",
                    'frame_analysis': f"Frame quality score: {round(frame_score, 2)}% - Based on frame consistency",
                    'audio_sync': f"Audio-visual sync score: {round(audio_score, 2)}% - Based on lip sync analysis"
                }
            }

            return jsonify(results), 200

        except Exception as e:
            logging.error(f"Error processing video: {str(e)}")
            return jsonify({
                'error': str(e),
                'status': 'failed',
                'message': 'Failed to process video'
            }), 500

        finally:
            # Clean up: remove the temporary file
            try:
                if os.path.exists(video_path):
                    os.remove(video_path)
            except Exception as e:
                logging.error(f"Error removing temporary file: {str(e)}")

    except Exception as e:
        logging.error(f"Server error: {str(e)}")
        return jsonify({
            'error': str(e),
            'status': 'failed',
            'message': 'Server error occurred'
        }), 500

# Add error handler for file too large
@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'error': 'File is too large',
        'status': 'failed',
        'message': 'The file exceeds the maximum allowed size of 16MB'
    }), 413


# ----------- RUN FLASK APP -------------

if __name__ == "__main__":
    app.run(debug=True)
