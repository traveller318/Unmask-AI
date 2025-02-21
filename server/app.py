from flask import Flask, request, jsonify
from transformers import pipeline
from PIL import Image
import io
import cv2
import numpy as np
import mediapipe as mp
import nbformat
from nbconvert import PythonExporter

def load_notebook_function(notebook_path, function_name):
    with open(notebook_path) as f:
        nb = nbformat.read(f, as_version=4)
    exporter = PythonExporter()
    source, _ = exporter.from_notebook_node(nb)
    code = compile(source, notebook_path, 'exec')
    namespace = {}
    exec(code, namespace)
    return namespace[function_name]

analyze_video_sentiment = load_notebook_function('./senti.ipynb', 'analyze_video_sentiment')

# Initialize Flask app
app = Flask(__name__)

@app.route('/analyze_sentiment', methods=['POST'])
def analyze_sentiment():
    if 'video' not in request.files:
        return jsonify({'error': 'No video uploaded'}), 400

    video_file = request.files['video']
    result = analyze_video_sentiment(video_file)
    return jsonify(result)


# Add root route
@app.route('/', methods=['GET'])
def hello():
    return jsonify({"message": "Hello, working!"})

# Load deepfake detection model
pipe = pipeline("image-classification", model="prithivMLmods/Deep-Fake-Detector-Model")

# Initialize MediaPipe FaceMesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

def calculate_face_distortion(image):
    """Detects facial landmarks using MediaPipe FaceMesh and calculates distortion score."""
    # Convert PIL Image to cv2 format
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    
    # Process the image
    results = face_mesh.process(image_cv)
    
    if not results.multi_face_landmarks:
        return {"error": "No face detected"}

    distortions = []
    for face_landmarks in results.multi_face_landmarks:
        # Convert landmarks to numpy array
        points = np.array([[lm.x * image_cv.shape[1], lm.y * image_cv.shape[0]] 
                          for lm in face_landmarks.landmark])
        
        # Calculate facial symmetry metrics
        try:
            # Eye symmetry
            left_eye = np.mean(points[133:144], axis=0)
            right_eye = np.mean(points[362:373], axis=0)
            eye_symmetry = np.linalg.norm(left_eye - right_eye)

            # Jaw symmetry
            jaw_left = np.mean(points[234:240], axis=0)
            jaw_right = np.mean(points[454:460], axis=0)
            jaw_symmetry = np.linalg.norm(jaw_left - jaw_right)

            # Calculate overall distortion score
            distortion_score = (eye_symmetry + jaw_symmetry) / 2
            
            # Normalize scores to 0-100 range
            max_expected_distortion = 100  # Adjust based on your needs
            normalized_score = min((distortion_score / max_expected_distortion) * 100, 100)

            distortions.append({
                "face_id": len(distortions) + 1,
                "eye_symmetry": round(eye_symmetry, 4),
                "jaw_symmetry": round(jaw_symmetry, 4),
                "distortion_score": round(normalized_score, 2)
            })
        except IndexError:
            return {"error": "Failed to calculate facial metrics"}

    return distortions

def convert_to_jpg(image):
    """Convert image to JPG format while preserving quality"""
    if image.format != 'JPEG':
        # Create a new RGB image with white background
        rgb_image = Image.new('RGB', image.size, (255, 255, 255))
        # Paste the original image, handling transparency
        if image.mode == 'RGBA':
            rgb_image.paste(image, mask=image.split()[3])
        else:
            rgb_image.paste(image)
        
        # Save as JPG in memory
        jpg_buffer = io.BytesIO()
        rgb_image.save(jpg_buffer, format='JPEG', quality=95)
        jpg_buffer.seek(0)
        return Image.open(jpg_buffer)
    return image

@app.route('/predict', methods=['POST'])
def detect_deepfake():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    
    # Read the original image
    original_image = Image.open(io.BytesIO(image_file.read()))
    
    # Convert to JPG
    image = convert_to_jpg(original_image)

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
        "face_distortion": distortion_data,  # Face distortion metrics
        "image_format": "JPEG"  # Indicate the format in the response
    }

    return jsonify(response)  # Return results as JSON

if __name__ == '__main__':
    print("🚀 Server is running at http://127.0.0.1:5000/")
    app.run(debug=True)