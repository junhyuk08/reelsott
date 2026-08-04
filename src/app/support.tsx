import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '코인은 어떻게 모을 수 있나요?',
    answer:
      '현재는 결제(충전) 연동 전이라, 마이페이지의 "코인 충전하기"를 누르면 출석체크 화면으로 이동해요. 매일 출석체크와 광고 시청으로 코인을 모을 수 있습니다.',
  },
  {
    question: '유료 회차 잠금해제에는 코인이 얼마나 필요한가요?',
    answer: '회차 하나를 잠금해제하는 데 30코인이 필요해요. 각 작품의 무료 회차 이후부터 코인이 사용됩니다.',
  },
  {
    question: '광고를 봤는데 코인이 지급되지 않았어요.',
    answer:
      '광고 보상은 하루 1회만 받을 수 있어요. 이미 오늘 보상을 받았다면 다음날 다시 시도해주세요. 광고가 끝까지 재생되지 않으면 보상이 지급되지 않을 수 있습니다.',
  },
  {
    question: '출석체크는 어떻게 하나요?',
    answer:
      '출석체크 탭에서 하루 한 번 버튼을 누르면 코인을 받을 수 있어요. 전날에 이어서 연속으로 출석하면 연속 출석일이 쌓입니다.',
  },
  {
    question: '이메일이 아니라 닉네임으로도 로그인할 수 있나요?',
    answer: '네, 로그인 화면에서 이메일 또는 닉네임 중 편한 방법으로 로그인할 수 있어요.',
  },
  {
    question: '회원탈퇴는 어떻게 하나요?',
    answer:
      '마이페이지 하단의 "회원탈퇴"를 누르고 비밀번호를 입력하면 탈퇴가 진행돼요. 탈퇴 시 시청기록, 찜한 작품 등 계정 정보가 함께 삭제되며 되돌릴 수 없어요.',
  },
];

function FaqRow({ item, expanded, onPress }: { item: FaqItem; expanded: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.faqCard}>
      <Pressable onPress={onPress} style={styles.faqQuestionRow}>
        <ThemedText type="small" style={styles.faqQuestionText}>
          {item.question}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {expanded ? '−' : '+'}
        </ThemedText>
      </Pressable>
      {expanded && (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={[styles.faqAnswer, { borderTopColor: theme.backgroundSelected }]}>
          {item.answer}
        </ThemedText>
      )}
    </ThemedView>
  );
}

export default function SupportScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, isLoggedIn } = useSession();

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!session) return;

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setError(null);
    setSubmitting(true);

    const { error: insertError } = await supabase.from('support_inquiries').insert({
      user_id: session.user.id,
      title: trimmedTitle,
      content: trimmedContent,
    });

    setSubmitting(false);

    if (insertError) {
      setError('문의 등록에 실패했어요. 다시 시도해주세요.');
      return;
    }

    setSubmitted(true);
    setTitle('');
    setContent('');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              자주 묻는 질문
            </ThemedText>
            {FAQ_ITEMS.map((item, index) => (
              <FaqRow
                key={item.question}
                item={item}
                expanded={expandedIndex === index}
                onPress={() => setExpandedIndex((prev) => (prev === index ? null : index))}
              />
            ))}

            <ThemedText type="subtitle" style={styles.sectionTitle}>
              문의하기
            </ThemedText>

            {!isLoggedIn ? (
              <ThemedView type="backgroundElement" style={styles.loginPromptCard}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.loginPromptText}>
                  문의 등록은 로그인 후 이용할 수 있어요.
                </ThemedText>
                <Pressable onPress={() => router.push('/login')} style={styles.loginPromptButton}>
                  <ThemedText type="small" style={styles.loginPromptButtonText}>
                    로그인하기
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : submitted ? (
              <ThemedView type="backgroundElement" style={styles.loginPromptCard}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.loginPromptText}>
                  문의가 정상적으로 접수되었어요. 확인 후 답변드릴게요.
                </ThemedText>
                <Pressable onPress={() => setSubmitted(false)} style={styles.loginPromptButton}>
                  <ThemedText type="small" style={styles.loginPromptButtonText}>
                    문의 추가로 남기기
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ) : (
              <ThemedView style={styles.form}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                  placeholder="제목"
                  placeholderTextColor={theme.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.contentInput,
                    { backgroundColor: theme.backgroundElement, color: theme.text },
                  ]}
                  placeholder="문의 내용을 입력해주세요"
                  placeholderTextColor={theme.textSecondary}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                />

                {error && (
                  <ThemedText type="small" style={styles.errorText}>
                    {error}
                  </ThemedText>
                )}

                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={[styles.submitButton, submitting && styles.disabled]}>
                  <ThemedText style={styles.submitButtonText}>
                    {submitting ? '등록 중...' : '문의 등록'}
                  </ThemedText>
                </Pressable>
              </ThemedView>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingBottom: Spacing.five,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  faqCard: {
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  faqQuestionText: {
    flex: 1,
    marginRight: Spacing.two,
  },
  faqAnswer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    paddingTop: Spacing.two,
    lineHeight: 20,
  },
  loginPromptCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  loginPromptText: {
    textAlign: 'center',
  },
  loginPromptButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  loginPromptButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  form: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 1,
    fontSize: 16,
  },
  contentInput: {
    minHeight: 140,
  },
  errorText: {
    color: '#D33',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
    boxShadow: '0 6px 10px rgba(255, 59, 92, 0.25)',
  },
  disabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
