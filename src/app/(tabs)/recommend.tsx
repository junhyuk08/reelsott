import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, useWindowDimensions, type ViewToken } from 'react-native';

import { DiscoverReel } from '@/components/discover-reel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useDiscoverFeed, type DiscoverItem } from '@/hooks/use-discover-feed';
import { useFavorites } from '@/hooks/use-favorites';
import { useSession } from '@/hooks/use-session';

export default function RecommendScreen() {
  const router = useRouter();
  const { session, isLoggedIn } = useSession();
  const { height: windowHeight } = useWindowDimensions();
  const { items, loading, error } = useDiscoverFeed();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const listRef = useRef<FlatList<DiscoverItem>>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [pageHeight, setPageHeight] = useState(windowHeight);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems.find((viewToken) => viewToken.isViewable);
    if (visible?.index != null) {
      setFocusedIndex(visible.index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  function handleContinue(dramaId: string) {
    if (!isLoggedIn || !session) {
      router.push('/login');
      return;
    }
    router.push({ pathname: '/drama/[id]', params: { id: dramaId } });
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <ActivityIndicator color="#ffffff" />
      </ThemedView>
    );
  }

  if (error || items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar style="light" />
        <ThemedText style={styles.emptyGlyph}>{error ? '⚠️' : '🍿'}</ThemedText>
        <ThemedText style={styles.message}>{error ? '콘텐츠를 불러오지 못했어요.' : '아직 콘텐츠가 없어요.'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.dramaId}
        getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <DiscoverReel
            item={item}
            height={pageHeight}
            isFocused={index === focusedIndex}
            isFavorite={favoriteIds.has(item.dramaId)}
            onToggleFavorite={() => toggleFavorite(item.dramaId)}
            onContinue={() => handleContinue(item.dramaId)}
          />
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyGlyph: {
    fontSize: 40,
  },
  message: {
    color: '#ffffff',
    opacity: 0.8,
    paddingHorizontal: Spacing.four,
    textAlign: 'center',
  },
});
