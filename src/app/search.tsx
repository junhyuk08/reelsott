import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFavorites } from '@/hooks/use-favorites';
import { useSearch } from '@/hooks/use-search';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { recordWatchHistory } from '@/lib/watch-history';

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, isLoggedIn } = useSession();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [query, setQuery] = useState('');
  const { results, loading, error } = useSearch(query);

  function handlePressDrama(dramaId: string) {
    if (!isLoggedIn || !session) {
      router.push('/login');
      return;
    }
    recordWatchHistory(session.user.id, dramaId);
    router.push({ pathname: '/drama/[id]', params: { id: dramaId } });
  }

  const trimmedQuery = query.trim();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <TextInput
          autoFocus
          style={[styles.searchInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          placeholder="제목, 장르로 검색"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {!trimmedQuery ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            검색어를 입력해보세요.
          </ThemedText>
        ) : error ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            검색 중 오류가 발생했어요.
          </ThemedText>
        ) : loading ? null : results.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
            &ldquo;{trimmedQuery}&rdquo;에 대한 검색 결과가 없어요.
          </ThemedText>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.row}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <DramaCard
                drama={item}
                onPress={() => handlePressDrama(item.id)}
                isFavorite={favoriteIds.has(item.id)}
                onToggleFavorite={isLoggedIn ? () => toggleFavorite(item.id) : undefined}
              />
            )}
          />
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
  searchInput: {
    height: 44,
    borderRadius: Spacing.five,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.three,
  },
  message: {
    padding: Spacing.four,
    textAlign: 'center',
  },
});
