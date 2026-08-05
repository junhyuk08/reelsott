import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';

export default function NotificationSettingsScreen() {
  const theme = useTheme();
  const { session, isLoggedIn, loading } = useSession();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loadingSetting, setLoadingSetting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    supabase
      .from('profiles')
      .select('push_enabled')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPushEnabled(data.push_enabled);
        setLoadingSetting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading) return null;
  if (!isLoggedIn || !session) return <Redirect href="/login" />;
  if (loadingSetting) return null;

  async function handleToggle(value: boolean) {
    if (!session) return;

    setPushEnabled(value);
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ push_enabled: value })
      .eq('id', session.user.id);

    setSaving(false);

    if (updateError) {
      setPushEnabled(!value);
      setError('설정을 저장하지 못했어요. 다시 시도해주세요.');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <ThemedText type="default">푸시 알림</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                새 소식과 이벤트 알림을 받아요
              </ThemedText>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleToggle}
              disabled={saving}
              trackColor={{ false: theme.backgroundSelected, true: ACCENT }}
              thumbColor="#ffffff"
            />
          </View>
        </ThemedView>

        {error && (
          <ThemedText type="small" style={styles.errorText}>
            {error}
          </ThemedText>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  card: {
    margin: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    gap: 2,
    flexShrink: 1,
  },
  errorText: {
    color: '#D33',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
