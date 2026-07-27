import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NEW_DRAMAS, TRENDING_DRAMAS } from '@/constants/dramas';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

function DramaRow({ title, data, onPressDrama }: { title: string; data: typeof TRENDING_DRAMAS; onPressDrama: () => void }) {
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

  function handlePressDrama() {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }

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

          <DramaRow title="인기 급상승" data={TRENDING_DRAMAS} onPressDrama={handlePressDrama} />
          <DramaRow title="새로 나온 작품" data={NEW_DRAMAS} onPressDrama={handlePressDrama} />
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
