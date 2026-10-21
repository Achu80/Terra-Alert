import BackendStatus from '@/components/BackendStatus';
import Screen from '@/components/Screen';

// TODO: port the rest from the web frontend
export default function SettingsScreen() {
    return (
        <Screen title="Settings" subtitle="Preferences and notifications">
            <BackendStatus />
        </Screen>
    );
}
