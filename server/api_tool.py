from flask import Flask, request, jsonify
import requests
from PIL import Image
import io
import cv2
import numpy as np
from transformers import pipeline
from keras.models import load_model

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
        predictions = model.process_video(video_path)
        deepfake_count = sum(1 for pred in predictions if pred > 0.5)
        total_frames = len(predictions)
        deepfake_percentage = (deepfake_count / total_frames) * 100 if total_frames > 0 else 0

        return jsonify({
            'total_frames': total_frames,
            'deepfake_frames': deepfake_count,
            'deepfake_percentage': deepfake_percentage
        })

    return jsonify({'error': 'Unsupported file type'}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)

