import type { Drama } from '@/components/drama-card';

export const ALL_DRAMAS: Drama[] = [
  { id: '1', title: '재벌집 아르바이트생', genre: '로맨스', episodeCount: 24 },
  { id: '2', title: '복수는 나의 것', genre: '드라마', episodeCount: 18 },
  { id: '3', title: '계약직 신입사원', genre: '오피스', episodeCount: 16 },
  { id: '4', title: '전생의 남편', genre: '판타지', episodeCount: 30 },
  { id: '5', title: '비밀 아내', genre: '스릴러', episodeCount: 20 },
  { id: '6', title: '사장님의 계약연애', genre: '로맨스', episodeCount: 22 },
];

export const TRENDING_DRAMAS: Drama[] = [ALL_DRAMAS[1], ALL_DRAMAS[4], ALL_DRAMAS[0], ALL_DRAMAS[5]];

export const NEW_DRAMAS: Drama[] = [ALL_DRAMAS[3], ALL_DRAMAS[2], ALL_DRAMAS[5], ALL_DRAMAS[1]];
