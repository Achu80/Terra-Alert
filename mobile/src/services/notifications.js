/**
 * Phone notifications: asks for permission, gets this phone's Expo push token, and sets how alerts appear.
 * Push needs a development build (Expo Go does not include push on Android in this SDK).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'landslide-alerts';

// Show alerts as banners even while the app is open
export function setupNotifications() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'Landslide alerts',
            importance: 4, // Android "high": shows as a heads-up banner with sound
        }).catch(() => {});
    }
}

/** Returns this phone's Expo push token. Throws a message the person can read if it can't be done. */
export async function getPushToken() {
    if (!Device.isDevice) {
        throw new Error('Phone notifications work on a real phone, not an emulator.');
    }
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
        status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') {
        throw new Error('Allow notifications in your phone settings to get app alerts.');
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
        throw new Error('App notifications are not set up yet (the app is not linked to an Expo project).');
    }
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
}
