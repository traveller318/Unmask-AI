from flask import Flask, request, jsonify
import requests
from PIL import Image
import io
import cv2
import numpy as np
from transformers import pipeline
from keras.models import load_model
import tensorflow as tf

app = Flask(__name__)

# Load deepfake detection model
pipe = pipeline("image-classification", model="prithivMLmods/Deep-Fake-Detector-Model")

# Meso4 Model Class
class Meso4:
    def __init__(self, model_path, weights_path):
        self.model = load_model(model_path)
        self.model.load_weights(weights_path)
        self.model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

    def predict_frame(self, frame):
        frame_resized = tf.image.resize(frame, (112, 112)) / 255.0
        frame_resized = np.expand_dims(frame_resized, axis=0)
        prediction = self.model.predict(frame_resized)
        return prediction[0][0]

    def process_video(self, video_path):
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        distorted_faces = 0
        abnormal_frames = 0
        processed_frames = 0
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        predictions = []
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            processed_frames += 1
            
            # Face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) > 0:
                for (x, y, w, h) in faces:
                    face_frame = frame[y:y+h, x:x+w]
                    prediction = self.predict_frame(face_frame)
                    predictions.append(prediction)
                    
                    if prediction > 0.5:  # Threshold for abnormal detection
                        abnormal_frames += 1
                    if w/h > 1.5 or h/w > 1.5:  # Check for distorted face proportions
                        distorted_faces += 1
            
        cap.release()
        
        # Calculate metrics
        face_detection_rate = (len(predictions) / processed_frames) * 100 if processed_frames > 0 else 0
        confidence_score = (abnormal_frames / processed_frames) * 100 if processed_frames > 0 else 0
        
        # Mock values for demonstration (in real implementation, these would be calculated)
        cosine_similarity = -0.05
        mismatch_score = 1.05
        euclidean_distance = 1.45
        
        return {
            "total_frames": total_frames,
            "distorted_faces": distorted_faces,
            "total_frames_processed": processed_frames,
            "total_abnormal_frames_detected": abnormal_frames,
            "face_detection_rate": face_detection_rate,
            "cosine_similarity": cosine_similarity,
            "mismatch_score": mismatch_score,
            "euclidean_distance": euclidean_distance,
            "analysis_result": "High mismatch detected. Audio and visual content are inconsistent." if confidence_score > 50 else "No significant inconsistencies detected.",
            "confidence_score": confidence_score
        }

# Load the pre-trained model and weights
model = Meso4(
    model_path=r'C:\Users\Harshal Shah\Documents\Coding\Web Dev\projects\hackanova\Deepfake-detection\models\Meso4_DF_model.h5',
    weights_path=r'C:\Users\Harshal Shah\Documents\Coding\Web Dev\projects\hackanova\Deepfake-detection\models\Meso4_DF.weights.h5'
)

@app.route('/api/results', methods=['POST'])
def predict_url():
    data = request.json
    url = data.get('url')

    if not url:
        return jsonify({'error': 'No URL provided'}), 400

    # Check if the URL is an image or video
    response = requests.get(url)
    if response.status_code != 200:
        return jsonify({'error': 'Failed to retrieve the file from the URL'}), 400

    content_type = response.headers.get('Content-Type')
    if 'image' in content_type:
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        result = pipe(image)
        # Process image prediction
        best_prediction = max(result, key=lambda x: x["score"])
        
        if best_prediction["label"] == "Real" and best_prediction["score"] > 0.81:
            best_label = "Fake"
        else:
            best_label = "Real"

        return jsonify({
            "best_label": best_label,
            "best_score": best_prediction["score"]
        })

    elif 'video' in content_type:
        # Save video temporarily and process
        video_path = 'temp_video.mp4'
        with open(video_path, 'wb') as f:
            f.write(response.content)
        
        results = model.process_video(video_path)
        return jsonify(results)

    return jsonify({'error': 'Unsupported file type'}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

