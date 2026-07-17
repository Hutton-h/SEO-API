import { apiGet, apiPost } from './api';

export interface YouTubeKeyword {
  id: string;
  keyword: string;
  position: number;
  previousPosition: number;
  change: number;
  views: number;
  avgViews: number;
  competition: 'low' | 'medium' | 'high';
}

export interface YouTubeVideo {
  title: string;
  views: number;
  likes: number;
  comments: number;
  watchTime: number;
  position: number;
}

export const youtubeAPI = {
  // 获取 YouTube 关键词排名
  getYouTubeKeywords: (projectId: string) =>
    apiGet<YouTubeKeyword[]>(`/projects/${projectId}/youtube/keywords`),

  // 获取 YouTube 视频统计数据
  getYouTubeVideos: (projectId: string) =>
    apiGet<YouTubeVideo[]>(`/projects/${projectId}/youtube/videos`),

  // 刷新 YouTube 数据
  refreshYouTubeData: (projectId: string) =>
    apiPost<{ message: string }>(`/projects/${projectId}/youtube/refresh`),
};