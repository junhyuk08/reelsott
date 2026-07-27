import { useRouter } from 'expo-router';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DramaCard } from '@/components/drama-card';
import { HomeHeader } from '@/components/home-header';
import { ThemedView } from '@/components/themed-view';
import { ALL_DRAMAS } from '@/constants/dramas';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

export default function HomeScreen() {
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
        <HomeHeader />
        <FlatList
          data={ALL_DRAMAS}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => <DramaCard drama={item} onPress={handlePressDrama} />}
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
});
