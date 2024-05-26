import face_recognition


def calculate_similarity_score(distance, min_distance=0.38, max_distance=0.69):
    if distance < min_distance:
        return 100.0
    elif distance > max_distance:
        return 0.0
    else:
        return (1 - (distance - min_distance) / (max_distance - min_distance)) * 100

def face_similarity(reference_path, test_path):
    try:
        reference_image = face_recognition.load_image_file(reference_path)
        test_image = face_recognition.load_image_file(test_path)
        reference_encodings = face_recognition.face_encodings(reference_image)
        test_encodings = face_recognition.face_encodings(test_image)

        if not reference_encodings or not test_encodings:
            return {"error": "No faces detected in one or both images", "results": []}

        face_distance = face_recognition.face_distance([reference_encodings[0]], test_encodings[0])
        similarity_score = calculate_similarity_score(face_distance[0])
        return [{"similarity_score": similarity_score}]
    except Exception as e:
        return {"error": str(e), "results": []}
