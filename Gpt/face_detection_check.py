import face_recognition
import logging

logging.basicConfig(level=logging.INFO)

def detect_faces(profile_image_path):
    image = face_recognition.load_image_file(profile_image_path)
    face_locations = face_recognition.face_locations(image)
    logging.info(f"Found {len(face_locations)} face(s) in the image.")
    return len(face_locations) > 0
