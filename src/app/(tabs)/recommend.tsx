import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Drama } from '@/components/drama-card';
import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDramas } from '@/hooks/use-dramas';
import { useSession } from '@/hooks/use-session';

function DramaRow({ title, data, onPressDrama }: { title: string; data: Drama[]; onPressDrama: () => void }) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowContent}>
        {data.map((drama) => (
          <DramaCard key={drama.id} drama={drama} onPress={onPressDrama} style={styles.rowCard} />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

export default function RecommendScreen() {
  const router = useRouter();
  const { isLoggedIn } = useSession();
  const { dramas, loading, error } = useDramas();

  function handlePressDrama() {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }

  const trending = [...dramas].sort((a, b) => b.viewCount - a.viewCount).slice(0, 4);
  const newDramas = dramas.filter((drama) => drama.isNew);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.pageTitle}>
            추천
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.pageSubtitle}>
            취향에 맞춰 골라본 작품들이에요
          </ThemedText>

          {error ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.pageSubtitle}>
              작품을 불러오지 못했어요.
            </ThemedText>
          ) : loading ? null : (
            <>
              <DramaRow title="인기 급상승" data={trending} onPressDrama={handlePressDrama} />
              <DramaRow title="새로 나온 작품" data={newDramas} onPressDrama={handlePressDrama} />
            </>
          )}
        </ScrollView>
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
  scrollContent: {
    paddingVertical: Spacing.three,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    paddingHorizontal: Spacing.three,
  },
  pageSubtitle: {
    marginTop: Spacing.half,
    paddingHorizontal: Spacing.three,
  },
  section: {
    marginTop: Spacing.five,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
  },
  rowContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  rowCard: {
    width: 130,
    flex: 0,
  },
});
