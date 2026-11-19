"""
Phone notifications through Expo's push service (no cost, no account needed).

Each person's app registers an Expo push token together with the place they want warnings for.
Only devices within SMS_RADIUS_KM of a risky place are notified, so a warning for Mandi does not
reach people in Manali.
"""
import os
import time

import requests

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
BATCH_SIZE = 100  # Expo accepts up to 100 messages per request

# Remembers when each device was last notified about each place: {"token|lat,lon": unix_time}
_last_pushed = {}


class PushService:
    def __init__(self):
        self.radius_km = float(os.getenv('SMS_RADIUS_KM', '10'))
        self.cooldown_hours = float(os.getenv('SMS_COOLDOWN_HOURS', '6'))

    @staticmethod
    def _key(token: str, lat: float, lon: float) -> str:
        return f"{token}|{float(lat):.2f},{float(lon):.2f}"

    def _in_cooldown(self, token: str, lat: float, lon: float) -> bool:
        last = _last_pushed.get(self._key(token, lat, lon))
        return last is not None and (time.time() - last) < self.cooldown_hours * 3600

    def _prune_cooldowns(self, now: float) -> None:
        """Forget entries older than the cooldown so the dict does not grow forever."""
        limit = self.cooldown_hours * 3600
        for key, last in list(_last_pushed.items()):
            if now - last >= limit:
                _last_pushed.pop(key, None)

    def devices_near(self, lat: float, lon: float) -> list:
        """Active devices within radius_km of this place: [{'token', 'min_score'}]. Empty if the database is unavailable."""
        try:
            from database.repositories import PushRepository
            return PushRepository().find_near(lat, lon, self.radius_km) or []
        except Exception as e:
            print(f"WARNING: could not load push devices: {e}")
            return []

    def deactivate(self, token: str) -> None:
        """Stop sending to a token Expo says is no longer registered (app uninstalled, token changed)."""
        try:
            from database.repositories import PushRepository
            PushRepository().unregister(token)
        except Exception as e:
            print(f"WARNING: could not deactivate push device: {e}")

    def send(self, tokens: list, title: str, body: str) -> dict:
        """Send one notification to each token.
        Returns {'accepted': [tokens Expo accepted], 'unregistered': [tokens Expo says are dead]}.
        Tokens in a batch that failed to send are in neither list."""
        accepted, unregistered = [], []
        for i in range(0, len(tokens), BATCH_SIZE):
            chunk = tokens[i:i + BATCH_SIZE]
            # channelId must match the channel the app creates (mobile/src/services/notifications.js),
            # otherwise Android shows the alert on a fallback channel with different settings
            batch = [{'to': t, 'title': title, 'body': body, 'sound': 'default', 'priority': 'high',
                      'channelId': 'landslide-alerts'}
                     for t in chunk]
            try:
                resp = requests.post(EXPO_PUSH_URL, json=batch, timeout=15,
                                     headers={'Accept': 'application/json', 'Content-Type': 'application/json'})
                if not resp.ok:
                    print(f"Push failed: HTTP {resp.status_code}")
                    continue
                # Expo returns one ticket per message, in the same order as the batch
                tickets = resp.json().get('data', [])
                for token, ticket in zip(chunk, tickets):
                    if ticket.get('status') == 'ok':
                        accepted.append(token)
                    elif (ticket.get('details') or {}).get('error') == 'DeviceNotRegistered':
                        unregistered.append(token)
                    else:
                        print(f"Push rejected: {ticket.get('message')}")
            except Exception as e:
                print(f"Push failed: {e}")
        return {'accepted': accepted, 'unregistered': unregistered}

    def send_risk_alert(self, lat: float, lon: float, days: list) -> int:
        """Notify devices near this place. days = [(date, score, level), ...] like the SMS summary.
        Returns how many notifications were accepted."""
        if not days:
            return 0
        worst = max(days, key=lambda d: d[1])
        title = f"Landslide risk {worst[2]} near {float(lat):.2f}, {float(lon):.2f}"
        body = (f"Risk {worst[2]} (score {worst[1]:.0f}/100) on {worst[0]}. "
                "Stay away from slopes and follow local authority advice.")

        # Each device has its own level: locals get High and above, visitors get Critical only
        worst_score = worst[1]
        tokens = [d['token'] for d in self.devices_near(lat, lon)
                  if worst_score >= d['min_score'] and not self._in_cooldown(d['token'], lat, lon)]
        if not tokens:
            return 0
        result = self.send(tokens, title, body)

        # Only a device that actually got the message enters the cooldown; a failed send can be retried next check
        now = time.time()
        for t in result['accepted']:
            _last_pushed[self._key(t, lat, lon)] = now
        for t in result['unregistered']:
            self.deactivate(t)
        self._prune_cooldowns(now)

        sent = len(result['accepted'])
        print(f"INFO: push alert for {lat}, {lon}: {len(tokens)} device(s) matched, {sent} accepted by Expo, "
              f"{len(result['unregistered'])} unregistered")
        return sent
