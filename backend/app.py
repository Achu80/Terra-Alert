import os

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS
from routes.api_routes import api_bp
from routes.forecast_routes import forecast_bp
from routes.chatbot import chatbot_bp
from routes.admin_routes import admin_bp
from routes.subscriber_routes import subscriber_bp
from routes.push_routes import push_bp

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(api_bp, url_prefix='/api')
app.register_blueprint(forecast_bp, url_prefix='/api/forecast')
app.register_blueprint(chatbot_bp, url_prefix='/api')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(subscriber_bp, url_prefix='/api/subscribers')
app.register_blueprint(push_bp, url_prefix='/api/push')

@app.route('/')
def home():
    return jsonify({'message': 'Backend is running'})

# Production servers (gunicorn etc.) import this module instead of running it as __main__,
# so the automatic alert check has to start here too. Run one worker only: the check lives inside the process.
if __name__ != '__main__' and os.getenv('ALERT_SCHEDULER_ENABLED', 'true') == 'true':
    from services import alert_scheduler
    alert_scheduler.start(port=int(os.getenv('PORT', '5000')))

if __name__ == '__main__':
    from services import alert_scheduler
    # With debug reload the code runs twice; start the background check only in the process that serves requests
    if os.getenv('ALERT_SCHEDULER_ENABLED', 'true') == 'true' and os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        alert_scheduler.start(port=5000)
    app.run(debug=True, host='0.0.0.0', port=5000)
