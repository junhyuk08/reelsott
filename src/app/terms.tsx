import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Section = {
  heading: string;
  body: string;
};

const TERMS_SECTIONS: Section[] = [
  {
    heading: '제1조 (목적)',
    body:
      '이 약관은 릴스OTT(이하 "회사")가 제공하는 숏드라마 스트리밍 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.',
  },
  {
    heading: '제2조 (정의)',
    body:
      '① "서비스"란 회사가 모바일 애플리케이션을 통해 제공하는 숏드라마 콘텐츠 감상, 코인 적립·사용, 회원 관리 등 일체의 서비스를 의미합니다.\n② "이용자"란 이 약관에 따라 회사와 이용계약을 체결하고 서비스를 이용하는 회원 및 비회원을 말합니다.\n③ "코인"이란 서비스 내 유료 회차 잠금해제 등에 사용되는 서비스 내 가상의 재화를 의미합니다.',
  },
  {
    heading: '제3조 (약관의 효력 및 변경)',
    body:
      '① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.\n② 회사는 관련 법령을 위반하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경사유를 명시하여 최소 7일 전에 공지합니다. 이용자에게 불리한 변경의 경우 30일 전에 공지합니다.',
  },
  {
    heading: '제4조 (회원가입 및 이용계약의 성립)',
    body:
      '① 이용자는 회사가 정한 절차에 따라 이메일, 비밀번호, 닉네임 등 정보를 입력하여 회원가입을 신청합니다.\n② 회사는 이용자의 신청에 대해 서비스 이용을 승낙함으로써 이용계약이 성립합니다. 다만 닉네임 중복 등 회사가 정한 사유가 있는 경우 승낙을 유보하거나 거부할 수 있습니다.',
  },
  {
    heading: '제5조 (코인 및 유료 서비스)',
    body:
      '① 이용자는 출석체크, 광고 시청 등 회사가 정한 방법으로 코인을 적립할 수 있으며, 적립된 코인으로 유료 회차를 잠금해제할 수 있습니다.\n② 코인 결제(충전) 기능은 추후 순차적으로 제공될 예정이며, 유상으로 결제한 코인의 환불 등에 관한 사항은 별도로 정하는 바에 따릅니다.\n③ 회사의 정책 위반, 부정 이용 등이 확인되는 경우 회사는 관련 코인 적립 및 사용을 제한할 수 있습니다.',
  },
  {
    heading: '제6조 (이용자의 의무)',
    body:
      '이용자는 다음 각 호의 행위를 하여서는 안 됩니다.\n1. 타인의 정보를 도용하거나 허위 정보를 등록하는 행위\n2. 회사가 제공하는 서비스를 이용하여 부정하게 코인을 취득하거나 이를 타인에게 양도·매매하는 행위\n3. 서비스의 운영을 방해하거나 안정적인 운영을 저해하는 행위\n4. 콘텐츠를 무단으로 복제, 배포, 전송, 2차적저작물 작성 등에 이용하는 행위',
  },
  {
    heading: '제7조 (서비스의 제공 및 변경)',
    body:
      '① 회사는 연중무휴, 1일 24시간 서비스를 제공함을 원칙으로 합니다. 다만 시스템 점검 등 회사가 필요하다고 인정하는 경우 서비스 제공을 일시 중단할 수 있습니다.\n② 회사는 운영상, 기술상의 필요에 따라 제공하는 콘텐츠나 서비스의 내용을 변경할 수 있습니다.',
  },
  {
    heading: '제8조 (계약해지 및 이용제한)',
    body:
      '① 이용자는 마이페이지 내 회원탈퇴 기능을 통해 언제든지 이용계약을 해지할 수 있습니다.\n② 회사는 이용자가 이 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우, 사전 통지 후 이용을 제한하거나 계약을 해지할 수 있습니다.',
  },
  {
    heading: '제9조 (면책조항)',
    body:
      '① 회사는 천재지변, 통신사의 서비스 중단 등 회사가 통제할 수 없는 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.\n② 회사는 이용자가 서비스를 이용하여 기대하는 효용을 얻지 못한 것에 대해 책임을 지지 않으며, 이용자 상호간 또는 이용자와 제3자 간 분쟁에 대해 개입할 의무가 없습니다.',
  },
  {
    heading: '제10조 (분쟁해결)',
    body:
      '이 약관과 관련하여 회사와 이용자 간 분쟁이 발생한 경우, 양 당사자는 원만한 해결을 위해 성실히 협의하며, 협의가 이루어지지 않는 경우 관련 법령이 정하는 절차에 따릅니다.',
  },
];

const PRIVACY_SECTIONS: Section[] = [
  {
    heading: '1. 수집하는 개인정보 항목',
    body:
      '회사는 회원가입 시 이메일 주소, 비밀번호(암호화 저장), 닉네임을 수집합니다. 서비스 이용 과정에서 시청기록, 찜한 작품, 코인 적립·사용 내역, 접속 로그 등이 자동으로 생성되어 수집될 수 있습니다.',
  },
  {
    heading: '2. 개인정보의 수집 및 이용 목적',
    body:
      '① 회원 식별 및 서비스 제공(로그인, 콘텐츠 시청, 코인 적립·사용)\n② 부정 이용 방지 및 서비스 안정적 운영\n③ 고객문의 응대 및 공지사항 전달\n④ 서비스 개선을 위한 통계 분석(개인을 식별할 수 없는 형태로 처리)',
  },
  {
    heading: '3. 개인정보의 보유 및 이용 기간',
    body:
      '회사는 이용자가 회원탈퇴를 요청하거나 개인정보 수집·이용 목적이 달성된 경우 해당 개인정보를 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 법령이 정한 기간 동안 보관합니다.',
  },
  {
    heading: '4. 개인정보의 제3자 제공',
    body:
      '회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 이용자가 사전에 동의한 경우, 또는 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우는 예외로 합니다.',
  },
  {
    heading: '5. 이용자의 권리와 행사 방법',
    body:
      '이용자는 언제든지 마이페이지를 통해 자신의 개인정보를 조회할 수 있으며, 회원탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다. 그 밖의 개인정보 관련 문의는 고객센터를 통해 접수할 수 있습니다.',
  },
  {
    heading: '6. 개인정보의 안전성 확보 조치',
    body:
      '회사는 비밀번호 암호화 저장, 데이터베이스 접근 권한 관리(RLS) 등 개인정보를 안전하게 관리하기 위하여 필요한 기술적·관리적 조치를 취하고 있습니다.',
  },
  {
    heading: '7. 개인정보 보호책임자 및 문의처',
    body: '개인정보 관련 문의사항은 앱 내 마이페이지 > 고객센터의 문의하기를 통해 접수해주시기 바랍니다.',
  },
];

function TermsSection({ heading, body }: Section) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold">{heading}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionBody}>
        {body}
      </ThemedText>
    </ThemedView>
  );
}

export default function TermsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle" style={styles.docTitle}>
            이용약관
          </ThemedText>
          {TERMS_SECTIONS.map((section) => (
            <TermsSection key={section.heading} {...section} />
          ))}

          <ThemedText type="subtitle" style={styles.docTitle}>
            개인정보처리방침
          </ThemedText>
          {PRIVACY_SECTIONS.map((section) => (
            <TermsSection key={section.heading} {...section} />
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
    paddingBottom: Spacing.five,
  },
  docTitle: {
    fontSize: 20,
    lineHeight: 26,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  section: {
    marginTop: Spacing.three,
  },
  sectionBody: {
    marginTop: Spacing.one,
    lineHeight: 20,
  },
});
