import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Notice = {
  title: string;
  date: string;
  body: string;
};

const NOTICES: Notice[] = [
  {
    title: '릴스OTT 서비스 오픈 안내',
    date: '2026.07.24',
    body:
      '안녕하세요, 릴스OTT입니다. 짧고 몰입감 있는 숏드라마를 언제 어디서나 즐길 수 있는 서비스가 오픈했습니다. 많은 관심과 이용 부탁드립니다.',
  },
  {
    title: '출석체크 & 광고 보상 이벤트 오픈',
    date: '2026.07.30',
    body:
      '매일 출석체크로 코인을 받고, 짧은 광고 시청으로 추가 코인까지 받아가세요. 연속 출석할수록 더 알찬 보상이 기다리고 있어요.',
  },
  {
    title: '검색 기능 업데이트 안내',
    date: '2026.08.03',
    body: '이제 홈 화면 검색으로 제목과 장르를 함께 검색할 수 있습니다. 원하는 작품을 더 빠르게 찾아보세요.',
  },
  {
    title: '정기 서버 점검 안내',
    date: '2026.08.10',
    body:
      '보다 안정적인 서비스 제공을 위해 정기 점검을 진행합니다. 점검 시간 동안 일부 기능 이용이 제한될 수 있으니 이용에 참고해주세요.',
  },
];

export default function NoticesScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {NOTICES.map((notice) => (
            <ThemedView key={notice.title} type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">{notice.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
                {notice.date}
              </ThemedText>
              <ThemedText type="default" style={styles.body}>
                {notice.body}
              </ThemedText>
            </ThemedView>
          ))}
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
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
  },
  date: {
    marginTop: 2,
  },
  body: {
    marginTop: Spacing.two,
    lineHeight: 20,
  },
});
