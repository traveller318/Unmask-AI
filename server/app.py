from flask import Flask, request, jsonify
from transformers import pipeline
from PIL import Image
import io

app = Flask(__name__)

# Load the deepfake detection model pipeline    
pipe = pipeline("image-classification", model="prithivMLmods/Deep-Fake-Detector-Model")

@app.route('/predict', methods=['POST'])
def detect_deepfake():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image_file = request.files['image']
    image = Image.open(io.BytesIO(image_file.read())).convert("RGB")  # Read and convert image

    # Run inference
    result = pipe(image)

    return jsonify({'prediction': result})  # Return results as JSON

if __name__ == '__main__':
    app.run(debug=True)
