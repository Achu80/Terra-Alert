from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from routes.api_routes import api_bp

load_dotenv()

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(api_bp, url_prefix='/api')

@app.route('/')
def home():
    return jsonify({'message': 'Backend is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
