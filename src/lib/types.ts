export type TimeWindow = 'day' | 'week' | 'month';

export interface Repo {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  avatarUrl: string;
  url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  createdAt: string | null;
}
