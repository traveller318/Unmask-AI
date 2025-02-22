# pip install torch torchvision opencv-python facenet-pytorch

import torch
import torchvision.models as models
import cv2
import numpy as np
from facenet_pytorch import MTCNN
from PIL import Image
import os
import json
from torchvision import transforms

# Set device to GPU if available, otherwise use CPU
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# Load MTCNN for face detection
mtcnn = MTCNN(keep_all=True, device=device)

# Load a pre-trained MobileNetV2 model for deepfake detection
mobilenet_model = torch.hub.load('pytorch/vision:v0.10.0', 'mobilenet_v2', pretrained=True).to(device)
mobilenet_model.eval()

# Modify the final layer for binary classification (Real/Fake)
num_ftrs = mobilenet_model.classifier[1].in_features
mobilenet_model.classifier[1] = torch.nn.Linear(num_ftrs, 2).to(device)

# Define preprocessing transformations for MobileNetV2
transform = transforms.Compose([
    transforms.Resize((224, 224)),  # Resize to match the input size of MobileNetV2
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])  # Normalize the image
])

# Function to detect deepfakes in real-time
def detect_face_distortion(video_path, skip_frames=5):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video at path {video_path}")
        return 0, 0

    frame_count = 0
    total_frames = 0
    distorted_faces = 0
    example_abnormal_frame = None  # To store one example of an abnormal frame

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Skip frames to reduce processing load
        frame_count += 1
        if frame_count % skip_frames != 0:
            continue

        # Increment total frame count
        total_frames += 1

        # Convert frame to RGB for MTCNN
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Detect faces using MTCNN
        boxes, _ = mtcnn.detect(rgb_frame)
        if boxes is None:
            continue

        # Process each detected face
        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            face = rgb_frame[y1:y2, x1:x2]

            # Preprocess the face for MobileNetV2
            face_pil = Image.fromarray(face)
            input_tensor = transform(face_pil).unsqueeze(0).to(device)

            # Perform inference with MobileNetV2
            with torch.no_grad():
                output = mobilenet_model(input_tensor)
                _, predicted = torch.max(output, 1)
                prediction = "Real" if predicted.item() == 0 else "Fake"

            # If distortion (deepfake) is detected
            if prediction == "Fake":
                distorted_faces += 1

                # Save one example of an abnormal frame
                if example_abnormal_frame is None:
                    example_abnormal_frame = frame.copy()

                # Draw bounding box and label on the frame
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(frame, "Distorted Face", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

    cap.release()

    # Display one example of an abnormal frame
    # if example_abnormal_frame is not None:
    #     print("Displaying one example of an abnormal frame:")
    #     cv2.imshow("Example Abnormal Frame", example_abnormal_frame)
    #     cv2.waitKey(0)  # Wait until a key is pressed to close the window
    #     cv2.destroyAllWindows()
    # else:
    #     print("No abnormal frames detected.")
    # Save results to a JSON file
    results_file_path = 'results.json'

# Prepare the data to be saved
    results_data = {
        'total_frames': total_frames,
        'distorted_faces': distorted_faces
    }
    return total_frames, distorted_faces

