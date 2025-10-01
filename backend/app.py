from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import uuid
import whisper
from moviepy.editor import VideoFileClip

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp4', 'webm', 'avi', 'mov'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size

# Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

# Technical keywords for scoring
TECHNICAL_KEYWORDS = {
    'fullstack': [
        'javascript', 'react', 'node', 'express', 'mongodb', 'sql', 'database', 
        'frontend', 'backend', 'api', 'rest', 'html', 'css', 'framework',
        'responsive', 'bootstrap', 'jquery', 'ajax', 'json', 'authentication',
        'deployment', 'git', 'version control', 'testing', 'debugging'
    ],
    'ai-ml': [
        'machine learning', 'deep learning', 'neural network', 'algorithm',
        'python', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
        'supervised', 'unsupervised', 'regression', 'classification', 'clustering',
        'feature', 'model', 'training', 'testing', 'validation', 'overfitting',
        'underfitting', 'cross-validation', 'accuracy', 'precision', 'recall'
    ],
    'cloud': [
        'aws', 'azure', 'google cloud', 'kubernetes', 'docker', 'containers',
        'microservices', 'serverless', 'lambda', 'ec2', 's3', 'database',
        'scaling', 'load balancer', 'cdn', 'vpc', 'security', 'devops',
        'ci/cd', 'infrastructure', 'monitoring', 'logging', 'backup'
    ]
}

# Filler words for negative scoring
FILLER_WORDS = ['um', 'uh', 'like', 'so', 'you know', 'basically', 'actually', 'literally']

@app.route('/api/questions/<role>', methods=['GET'])
def get_questions(role):
    """Get interview questions for selected role"""
    questions = {
        'fullstack': [
            "Tell me about yourself and your experience with full-stack development.",
            "Explain the difference between frontend and backend development. How do they work together?",
            "How would you optimize a slow-loading web application?",
            "Describe your experience with databases and how you handle data in web applications.",
            "What is your approach to testing and debugging web applications?"
        ],
        'ai-ml': [
            "Tell me about yourself and your experience with AI/ML.",
            "Explain the difference between supervised and unsupervised learning with examples.",
            "How would you handle overfitting in a machine learning model?",
            "Describe the process of feature engineering and why it's important.",
            "What evaluation metrics would you use for a classification problem?"
        ],
        'cloud': [
            "Tell me about yourself and your experience with cloud technologies.",
            "Explain the difference between IaaS, PaaS, and SaaS with examples.",
            "How would you design a scalable cloud architecture for a web application?",
            "Describe your experience with containerization and orchestration tools.",
            "How do you ensure security and monitoring in cloud deployments?"
        ]
    }
    
    if role.lower() in questions:
        return jsonify({"questions": questions[role.lower()]})
    else:
        return jsonify({"error": "Invalid role"}), 400

@app.route('/upload-video', methods=['POST'])
def upload_video():
    """Handle video upload and processing"""
    # Check if file is in request
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
    
    file = request.files['video']
    
    # Check if file was selected
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Check file type and save
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        
        # Create unique filename to avoid conflicts
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        return jsonify({
            "message": "Video uploaded successfully",
            "filename": unique_filename,
            "filepath": filepath
        }), 200
    else:
        return jsonify({"error": "Invalid file type. Allowed types: mp4, webm, avi, mov"}), 400

def extract_audio_from_video(video_path, audio_path):
    """Extract audio from video file using moviepy with WebM compatibility"""
    try:
        # First, try using ffmpeg directly (more reliable for WebM files)
        import subprocess
        import shutil
        
        # Check if ffmpeg is available
        ffmpeg_path = shutil.which('ffmpeg')
        if ffmpeg_path:
            print(f"Using FFmpeg at: {ffmpeg_path}")
            cmd = [
                ffmpeg_path, '-i', video_path, 
                '-vn',  # No video
                '-acodec', 'pcm_s16le',  # Audio codec
                '-ar', '44100',  # Sample rate
                '-ac', '1',      # Mono
                '-y',            # Overwrite output file
                audio_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print("FFmpeg extraction successful")
                return True
            else:
                print(f"FFmpeg error: {result.stderr}")
        else:
            print("FFmpeg not found in PATH")
        
        # Fallback to MoviePy with special handling for WebM files
        print("Trying MoviePy fallback...")
        
        # For WebM files, try to read without duration first
        video = VideoFileClip(video_path, verbose=False, logger=None)
        
        # Check if video has audio
        if video.audio is None:
            print("No audio track found in video")
            video.close()
            return False
        
        audio = video.audio
        
        # Try to get a reasonable duration
        try:
            duration = video.duration
            if duration is None or duration <= 0:
                print("Duration is None or invalid, trying to estimate...")
                # Try to read a small segment to estimate
                duration = 30  # Assume max 30 seconds for interview answers
        except:
            duration = 30  # Default duration
        
        print(f"Processing audio with duration: {duration}")
        
        # Write audio file with error handling
        audio.write_audiofile(
            audio_path, 
            verbose=False, 
            logger=None,
            codec='pcm_s16le',
            fps=44100,
            nbytes=2,
            temp_audiofile=None
        )
        
        audio.close()
        video.close()
        
        # Verify the output file was created
        if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
            print("MoviePy extraction successful")
            return True
        else:
            print("MoviePy created empty or no file")
            return False
            
    except Exception as e:
        print(f"Error extracting audio: {str(e)}")
        
        # Last resort: try simple conversion without duration check
        try:
            print("Trying simple MoviePy conversion...")
            from moviepy.editor import AudioFileClip
            
            # Try to load as audio directly if possible
            audio = AudioFileClip(video_path)
            audio.write_audiofile(audio_path, verbose=False, logger=None)
            audio.close()
            
            if os.path.exists(audio_path) and os.path.getsize(audio_path) > 0:
                print("Simple audio conversion successful")
                return True
                
        except Exception as last_error:
            print(f"Last resort failed: {str(last_error)}")
        
        return False

def transcribe_audio(audio_path):
    """Convert audio to text using whisper"""
    try:
        print(f"Loading Whisper model...")
        model = whisper.load_model("base")
        print(f"Transcribing audio file: {audio_path}")
        
        # Check if audio file exists and has content
        if not os.path.exists(audio_path):
            print(f"Audio file does not exist: {audio_path}")
            return None
            
        file_size = os.path.getsize(audio_path)
        print(f"Audio file size: {file_size} bytes")
        
        if file_size == 0:
            print("Audio file is empty")
            return None
        
        result = model.transcribe(audio_path)
        transcript = result["text"].strip()
        print(f"Transcription result: {transcript}")
        
        if not transcript:
            print("Transcription returned empty text")
            return "No speech detected in the audio."
        
        return transcript
    except Exception as e:
        print(f"Error transcribing audio: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def analyze_text_metrics(text):
    """Calculate basic text metrics"""
    if not text:
        return {"word_count": 0, "sentence_count": 0, "avg_words_per_sentence": 0}
    
    words = text.lower().split()
    sentences = text.split('.')
    sentences = [s.strip() for s in sentences if s.strip()]
    
    word_count = len(words)
    sentence_count = len(sentences)
    avg_words_per_sentence = word_count / sentence_count if sentence_count > 0 else 0
    
    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_words_per_sentence": round(avg_words_per_sentence, 2)
    }

def count_technical_keywords(text, role):
    """Count technical keywords for the given role"""
    if not text or role not in TECHNICAL_KEYWORDS:
        return 0
    
    text_lower = text.lower()
    keyword_count = 0
    
    for keyword in TECHNICAL_KEYWORDS[role]:
        if keyword in text_lower:
            keyword_count += 1
    
    return keyword_count

def count_filler_words(text):
    """Count filler words in the text"""
    if not text:
        return 0
    
    text_lower = text.lower()
    filler_count = 0
    
    for filler in FILLER_WORDS:
        filler_count += text_lower.count(filler)
    
    return filler_count

def calculate_nlp_score(text, role):
    """Calculate NLP score based on simple rules"""
    if not text:
        return 0.0
    
    # Get basic metrics
    metrics = analyze_text_metrics(text)
    word_count = metrics["word_count"]
    
    # Count technical keywords and filler words
    technical_keywords = count_technical_keywords(text, role)
    filler_words = count_filler_words(text)
    
    # Base score calculation
    score = 5.0  # Start with middle score
    
    # Word count scoring (optimal range: 50-200 words)
    if word_count < 20:
        score -= 2.0  # Too short
    elif word_count < 50:
        score -= 1.0
    elif word_count > 300:
        score -= 1.0  # Too long
    elif 50 <= word_count <= 200:
        score += 1.0  # Good length
    
    # Technical keywords scoring (more keywords = higher score)
    if technical_keywords >= 5:
        score += 2.0
    elif technical_keywords >= 3:
        score += 1.5
    elif technical_keywords >= 1:
        score += 1.0
    else:
        score -= 1.0  # No technical keywords
    
    # Filler words penalty
    filler_ratio = filler_words / word_count if word_count > 0 else 0
    if filler_ratio > 0.1:  # More than 10% filler words
        score -= 2.0
    elif filler_ratio > 0.05:  # More than 5% filler words
        score -= 1.0
    
    # Sentence structure bonus
    avg_words = metrics["avg_words_per_sentence"]
    if 8 <= avg_words <= 20:  # Good sentence structure
        score += 0.5
    
    # Ensure score is between 0 and 10
    score = max(0.0, min(10.0, score))
    
    return round(score, 1)

@app.route('/process-video', methods=['POST'])
def process_video():
    """Process video file: extract audio and convert to text"""
    try:
        data = request.get_json()
        
        if not data or 'filename' not in data:
            return jsonify({"error": "No filename provided"}), 400
        
        filename = data['filename']
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        print(f"Processing video: {filename}")
        print(f"Video path: {video_path}")
        
        # Check if video file exists
        if not os.path.exists(video_path):
            print(f"Video file not found: {video_path}")
            return jsonify({"error": "Video file not found"}), 404
        
        # Create audio filename
        audio_filename = f"{os.path.splitext(filename)[0]}.wav"
        audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
        
        print(f"Extracting audio to: {audio_path}")
        
        # Extract audio from video
        if not extract_audio_from_video(video_path, audio_path):
            print("Failed to extract audio from video")
            return jsonify({"error": "Failed to extract audio from video"}), 500
        
        print("Audio extraction successful, starting transcription...")
        
        # Transcribe audio to text
        transcript = transcribe_audio(audio_path)
        
        if transcript is None:
            print("Failed to transcribe audio")
            return jsonify({"error": "Failed to transcribe audio"}), 500
        
        print(f"Transcription successful: {transcript[:100]}...")
        
        # Clean up audio file
        try:
            os.remove(audio_path)
            print("Audio file cleaned up")
        except Exception as cleanup_error:
            print(f"Failed to clean up audio file: {cleanup_error}")
        
        # Get role and question index from request (optional)
        role = data.get('role', 'fullstack')
        question_index = data.get('question_index', 0)
        
        # Calculate NLP score
        nlp_score = calculate_nlp_score(transcript, role)
        
        # Get text metrics for additional info
        metrics = analyze_text_metrics(transcript)
        technical_keywords = count_technical_keywords(transcript, role)
        filler_words = count_filler_words(transcript)
        
        result = {
            "transcript": transcript,
            "score": nlp_score,
            "metrics": {
                "word_count": metrics["word_count"],
                "sentence_count": metrics["sentence_count"],
                "technical_keywords": technical_keywords,
                "filler_words": filler_words
            },
            "message": "Video processed successfully"
        }
        
        print("Processing completed successfully")
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Unexpected error in process_video: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/api/results', methods=['POST'])
def get_results():
    """Calculate and return interview results"""
    data = request.get_json()
    
    # Get individual scores from the request
    individual_scores = data.get('individual_scores', [])
    role = data.get('role', 'fullstack')
    
    if not individual_scores:
        return jsonify({"error": "No individual scores provided"}), 400
    
    # Calculate overall score (average of individual scores)
    overall_score = sum(individual_scores) / len(individual_scores)
    overall_score = round(overall_score, 1)
    
    # Generate simple feedback based on score
    if overall_score >= 8.0:
        feedback = "Excellent performance! Strong technical knowledge and clear communication."
    elif overall_score >= 6.5:
        feedback = "Good performance with solid technical understanding. Some areas for improvement."
    elif overall_score >= 5.0:
        feedback = "Average performance. Focus on using more technical terminology and reducing filler words."
    else:
        feedback = "Needs improvement. Practice technical concepts and communication skills."
    
    results = {
        "individual_scores": individual_scores,
        "overall_score": overall_score,
        "feedback": feedback,
        "role": role
    }
    
    return jsonify(results)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port, debug=False)