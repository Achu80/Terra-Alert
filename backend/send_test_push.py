"""
Send a test alert notification to one phone, through Expo's push service.

Use it to check the whole phone path (token, Expo, Firebase, sound) without waiting for a real risk alert.

Usage (from the backend folder):
    python send_test_push.py ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
    python send_test_push.py ExponentPushToken[xxxx] --title "Test" --body "Hello" --sound default

The token is printed in the mobile app's log when the phone registers, or copy it from the expo.dev
push tool. This script never reads tokens from the database, so it cannot message every phone.
"""
import argparse
import json
import re
import sys

import requests

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
# Must match CHANNEL_ID in mobile/src/services/notifications.js. On Android the channel decides the sound and
# importance, so the phone uses the channel the app created (high importance, heads-up banner, sound).
CHANNEL_ID = 'landslide-alerts'
TOKEN = re.compile(r'^Expo(nent)?PushToken\[[A-Za-z0-9_\-]+\]$')


def main() -> int:
    parser = argparse.ArgumentParser(description='Send a test alert notification to one phone.')
    parser.add_argument('token', help='Expo push token, e.g. ExponentPushToken[...]')
    parser.add_argument('--title', default='Terra Alert test: landslide warning')
    parser.add_argument('--body', default='This is a test alert from Terra Alert. No action is needed.')
    parser.add_argument('--sound', default='default', help="'default' or a sound file bundled in the app")
    args = parser.parse_args()

    if not TOKEN.match(args.token):
        print('That is not an Expo push token. It should look like ExponentPushToken[...]')
        return 2

    message = {
        'to': args.token,
        'title': args.title,
        'body': args.body,
        'sound': args.sound,
        'priority': 'high',
        'channelId': CHANNEL_ID,
        'data': {'test': True},
    }
    try:
        resp = requests.post(EXPO_PUSH_URL, json=[message], timeout=15,
                             headers={'Accept': 'application/json', 'Content-Type': 'application/json'})
    except requests.RequestException as e:
        print(f'Could not reach Expo: {e}')
        return 1

    print(f'HTTP {resp.status_code}')
    try:
        body = resp.json()
    except ValueError:
        print(resp.text)
        return 1
    print(json.dumps(body, indent=2))

    tickets = body.get('data', []) if isinstance(body, dict) else []
    if resp.ok and tickets and tickets[0].get('status') == 'ok':
        print('Expo accepted the notification. It should reach the phone within a few seconds.')
        return 0
    print('Expo did not accept the notification. Check the error above.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
