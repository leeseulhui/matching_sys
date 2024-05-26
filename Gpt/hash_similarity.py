import networkx as nx
import logging
from flask import Blueprint, request, jsonify
from googletrans import Translator
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Initialize Blueprint
similarity_blueprint = Blueprint('hash_similarity', __name__)

GLOVE_VECTOR_FILE = './glove/glove.6B.100d.txt'

# GloVe 벡터를 로드하는 함수
def load_glove_vectors(glove_file):
    glove_model = {}
    with open(glove_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.split()
            word = parts[0]
            vector = np.array(parts[1:], dtype=np.float32)
            glove_model[word] = vector
    return glove_model

# GloVe 모델 로드
model = load_glove_vectors(GLOVE_VECTOR_FILE)

def translate_words(words, src_lang='ko', dest_lang='en'):
    translator = Translator()
    translated_words = [translator.translate(word, src=src_lang, dest=dest_lang).text for word in words]
    return translated_words

def get_vector(word):
    """Return the vector for a word or phrase by averaging the vectors of known words."""
    words = word.split()
    word_vectors = []
    for w in words:
        if w in model:
            word_vectors.append(model[w])
    if word_vectors:
        return np.mean(word_vectors, axis=0)
    else:
        return None

def calculate_similarity(word1, word2):
    vector1 = get_vector(word1)
    vector2 = get_vector(word2)
    if vector1 is not None and vector2 is not None:
        return cosine_similarity([vector1], [vector2])[0][0]
    else:
        return 0

def add_edges_with_similarity(graph, tag1, tag2, similarities, threshold=0.3):
    if tag1 == tag2:
        return
    similarity = calculate_similarity(tag1, tag2)
    if similarity > threshold:
        graph.add_edge(tag1, tag2, weight=similarity)
        similarities.append({'tag1': tag1, 'tag2': tag2, 'similarity': float(similarity)})  # 유사도 정보를 콘솔에 출력
        logging.info("Tag similarity: %s - %s: %s", tag1, tag2, similarity)

def remove_low_connected_nodes(graph, threshold=0.1):
    removal = [node for node in graph.nodes if graph.degree(node) == 0 or 
               sum(graph[node][nbr]['weight'] for nbr in graph.neighbors(node)) / graph.degree(node) < threshold]
    graph.remove_nodes_from(removal)

@similarity_blueprint.route('/similarity', methods=['POST'])
def calculate_tag_similarity():
    data = request.get_json()

    user1_tags = data.get('hashtags_user1', [])
    user2_tags = data.get('hashtags_user2', [])
    user_id = data.get('userId', '')

    logging.info("Original User 1 Tags: %s", user1_tags)
    logging.info("Original User 2 Tags: %s", user2_tags)

    # 원래 해시태그 저장
    original_user1_tags = list(user1_tags)
    original_user2_tags = list(user2_tags)

    translated_user1_tags = translate_words(user1_tags)
    translated_user2_tags = translate_words(user2_tags)

    user1_tags = set(translated_user1_tags)
    user2_tags = set(translated_user2_tags)
    
    G = nx.Graph()
    similarities = []
    logging.info("Translated User 1 Tags: %s", translated_user1_tags)
    logging.info("Translated User 2 Tags: %s", translated_user2_tags)

    for tag1 in user1_tags:
        for tag2 in user2_tags:
            add_edges_with_similarity(G, tag1.strip(), tag2.strip(), similarities)

    remove_low_connected_nodes(G)

    # 필터링된 유사도를 포함한 edge들을 가져옵니다.
    filtered_edges = [(u, v, d['weight']) for u, v, d in G.edges(data=True) if d['weight'] >= 0.3]
    total_similarity = sum(d for u, v, d in filtered_edges)
    edge_count = len(filtered_edges)

    # Normalize the total_similarity to be between 0 and 1
    max_possible_similarity = edge_count  # since each edge can have a max weight of 1
    normalized_total_similarity = total_similarity / max_possible_similarity if max_possible_similarity > 0 else 0
    average_similarity = total_similarity / edge_count if edge_count > 0 else 0

    logging.info("total_similarity: %s", total_similarity)
    logging.info("normalized_total_similarity: %s", normalized_total_similarity)
    logging.info("average_similarity: %s", average_similarity)
    logging.info("edge_count: %s", edge_count)
    logging.info("userId: %s", user_id)

    # Set a threshold for determining if users are similar
    similarity_threshold = 0.5  # Example threshold, adjust based on empirical testing

    are_similar = average_similarity >= similarity_threshold

    # Filter tags with similarity > 0.5
    high_similarity_tags = {v for u, v, w in filtered_edges if w > 0.5}

    # 번역 전 해시태그에서 유사도가 높은 2번 유저의 태그 찾기
    original_high_similarity_tags_user2 = []
    for original_tag, translated_tag in zip(original_user2_tags, translated_user2_tags):
        if translated_tag in high_similarity_tags:
            original_high_similarity_tags_user2.append(original_tag)

    return jsonify({
        'userId': user_id,
        'total_similarity': float(normalized_total_similarity),
        'average_similarity': float(average_similarity),
        'number_of_connections': int(edge_count),
        'are_similar': bool(are_similar),
        'similarities': similarities,  # Return the similarities list
        'high_similarity_tags': list(high_similarity_tags),  # Return high similarity tags
        'original_high_similarity_tags_user2': original_high_similarity_tags_user2  # 원래 한국어 해시태그 중 유사도가 높은 태그
    })