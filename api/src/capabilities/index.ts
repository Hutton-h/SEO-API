// ============================================================================
// Crane SEO Platform — 能力层统一导出
// ============================================================================

// 接口
export {
  IBaseProvider,
  ISerpProvider,
  IKeywordDataProvider,
  IBacklinkProvider,
  IDomainDataProvider,
  IChatProvider,
  IEmbeddingProvider,
  IAudioProvider,
  IPerformanceProvider,
  ISearchConsoleProvider,
  IAnalyticsProvider,
  IIndexingProvider,
  INlpProvider,
  ITrendProvider,
  IWhoisProvider,
  ICaptchaSolver,
  INotificationProvider,
  ProviderStatus,
  ProviderError,
  CAPABILITIES,
} from './interfaces.js';

// 映射类型
export type {
  CapabilityMap,
  CapabilityName,
  AnyProvider,
  ProviderInfo,
  ProviderConfig,
  ProviderHealth,
} from './interfaces.js';

// DTO 类型
export type {
  Location,
  Language,
  DateRange,
  SortOrder,
  SortParams,
  PaginationParams,
  PaginatedResult,
  BatchResult,
  ErrorDetail,
  // SERP
  SerpParams,
  SerpResult,
  SerpResultItem,
  LocalSerpParams,
  LocalSerpResult,
  NewsSerpParams,
  NewsSerpResult,
  ShoppingSerpParams,
  ShoppingSerpResult,
  ImageSerpParams,
  ImageSerpResult,
  VideoSerpParams,
  VideoSerpResult,
  SerpFeatureResult,
  // 关键词
  KeywordParams,
  KeywordVolumeResult,
  RelatedKeyword,
  KeywordSuggestion,
  KeywordIdeaParams,
  KeywordIdea,
  KeywordDifficulty,
  VolumeHistoryPoint,
  // 外链
  BacklinkParams,
  BacklinkOverview,
  BacklinkItem,
  RefDomain,
  AnchorItem,
  // 域名
  DomainParams,
  DomainOverview,
  OrganicKeyword,
  PaidKeyword,
  TrafficEstimate,
  CompetitorInfo,
  // AI
  ChatMessage,
  ChatOptions,
  ChatResponse,
  ToolDefinition,
  ToolCallResponse,
  TranscribeOptions,
  TranscriptionResult,
  SpeakOptions,
  // 性能
  AuditOptions,
  PerformanceAudit,
  CrUXData,
  // GSC
  GSCQueryParams,
  GSCQueryResult,
  GSCPageResult,
  GSCCountryResult,
  GSCDeviceResult,
  UrlInspectionResult,
  SitemapInfo,
  SiteInfo,
  // Analytics
  AnalyticsParams,
  AnalyticsReport,
  RealtimeData,
  MetadataInfo,
  // 索引
  IndexingResult,
  IndexingStatus,
  BatchIndexingResult,
  // NLP
  EntityResult,
  SentimentResult,
  CategoryResult,
  SyntaxResult,
  // 趋势
  TrendParams,
  TrendData,
  RelatedQuery,
  RelatedTopic,
  RegionalData,
  TrendingParams,
  TrendingSearch,
  // WHOIS
  WhoisResult,
  WhoisHistory,
  // 验证码
  CaptchaParams,
  CaptchaSolution,
  // 通知
  NotificationMessage,
} from './dto.js';