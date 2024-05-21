import face_recognition

def detect_faces(profile_image_path):
    # 이미지 파일 로드 
    image = face_recognition.load_image_file(profile_image_path)

    # 이미지에서 얼굴 위치 탐지
    face_locations = face_recognition.face_locations(image)

    # 얼굴 탐지 결과에 따라 True 또는 False 반환
    if face_locations:
        print(f"Found {len(face_locations)} face(s) in this photograph.")
        return True
    else:
        print("No faces found in this photograph.")
        return False
