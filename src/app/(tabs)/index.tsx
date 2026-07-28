import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { HomeHeader } from '@/components/home-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ALL_DRAMAS } from '@/constants/dramas';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

export default function HomeScreen() {
  const router = useRouter();
  const { isLoggedIn } = useSession();
  const [query, setQuery] = useState('');

  const filteredDramas = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return ALL_DRAMAS;
    return ALL_DRAMAS.filter((drama) => drama.title.includes(trimmed));
  }, [query]);

  function handlePressDrama() {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <HomeHeader query={query} onQueryChange={setQuery} />
        <FlatList
          data={filteredDramas}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => <DramaCard drama={item} onPress={handlePressDrama} />}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              검색 결과가 없어요
            </ThemedText>
          }
        />
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
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
});
