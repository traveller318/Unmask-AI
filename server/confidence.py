import json
import os

# Define the path for the results.json file
results_file_path = 'results.json'

# Hyperparameters
alpha = 10  # Weight for distorted frames
beta = 6  # Weight for total abnormal frames detected
gamma = 4  # Weight for mismatch score

try:
    # Open the JSON file and load its content
    with open(results_file_path, 'r') as file:
        results_data = json.load(file)
    
    # Extract necessary values from the results data
    distorted_frames = results_data.get('distorted_faces', 0)
    total_frames = results_data.get('total_frames', 1)  # Avoid division by zero
    total_abnormal_frames_detected = results_data.get('total_abnormal_frames_detected', 0)
    total_frames_processed = results_data.get('total_frames_processed', 1)  # Avoid division by zero
    euclidean_distance = results_data.get('euclidean_distance', 0)
    mismatch_score = results_data.get('mismatch_score', 0)

    # Calculate the confidence score
    confidence_score = (
        (distorted_frames / (total_frames * alpha)) +
        (total_abnormal_frames_detected / (total_frames_processed * beta)) +
        (mismatch_score + euclidean_distance) / (gamma)
    ) * 100

    results_data = {
        'confidence_score': confidence_score
    }

    if os.path.exists(results_file_path) and os.path.getsize(results_file_path) > 0:
        with open(results_file_path, 'r') as file:
            existing_data = json.load(file)
        # Update the existing data with new results
        existing_data.update(results_data)
        results_data = existing_data
    
    # Write the results to the file
    with open(results_file_path, 'w') as file:
        json.dump(results_data, file, indent=4)
    
    print(f"Results saved to {results_file_path}: {results_data}")

    # Print the confidence score
    print(f"Confidence Score: {confidence_score}")

except FileNotFoundError:
    print(f"Error: The file {results_file_path} does not exist.")
except json.JSONDecodeError:
    print("Error: Failed to decode JSON from the file.")
except Exception as e:
    print(f"An error occurred: {str(e)}")
