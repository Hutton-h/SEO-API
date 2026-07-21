// ============================================================================
// Crane SEO Platform — 能力接口定义
// 文件: src/capabilities/interfaces.ts
// 设计原则: 业务引擎不直接依赖具体 API Provider，而是依赖这些抽象接口。
//            用户可随时插入自己的 API 实现（替换默认 Provider）。
// ============================================================================

import type {
  SerpParams, SerpResult, SerpResultItem, LocalSerpParams, LocalSerpResult,
  NewsSerpParams, NewsSerpResult, ShoppingSerpParams, ShoppingSerpResult,
  ImageSerpParams, ImageSerpResult, VideoSerpParams, VideoSerpResult,
  SerpFeatureResult, Location, Language,
  KeywordParams, KeywordVolumeResult, RelatedKeyword, KeywordSuggestion,
  KeywordIdeaParams, KeywordIdea, KeywordDifficulty, VolumeHistoryPoint,
  BacklinkParams, BacklinkOverview, BacklinkItem, RefDomain, AnchorItem,
  DomainParams, DomainOverview, OrganicKeyword, PaidKeyword, TrafficEstimate, CompetitorInfo,
  ChatMessage, ChatOptions, ChatResponse, ToolDefinition, ToolCallResponse,
  TranscribeOptions, TranscriptionResult, SpeakOptions,
  AuditOptions, PerformanceAudit, CrUXData,
  GSCQueryParams, GSCQueryResult, GSCPageResult, GSCCountryResult, GSCDeviceResult,
  UrlInspectionResult, SitemapInfo, SiteInfo,
  AnalyticsParams, AnalyticsReport, RealtimeData, MetadataInfo,
  IndexingResult, IndexingStatus, BatchIndexingResult,
  EntityResult, SentimentResult, CategoryResult, SyntaxResult,
  TrendParams, TrendData, RelatedQuery, RelatedTopic, RegionalData, TrendingParams, TrendingSearch,
  WhoisResult, WhoisHistory,
  CaptchaParams, CaptchaSolution,
  NotificationMessage,
} from './dto.js';

// ============================================================================
// ProviderStatus — 提供商运行状态
// ============================================================================

export enum ProviderStatus {
  /** 正在初始化 */
  INITIALIZING = 'INITIALIZING',
  /** 正常运行 */
  ACTIVE = 'ACTIVE',
  /** 部分功能降级（部分 API 不可用） */
  DEGRADED = 'DEGRADED',
  /** 完全不可用（熔断器打开） */
  UNAVAILABLE = 'UNAVAILABLE',
  /** 已关闭（不再使用） */
  SHUTDOWN = 'SHUTDOWN',
}

// ============================================================================
// ProviderHealth — 健康检查详细结果
// ============================================================================

export interface ProviderHealth {
  /** 是否健康 */
  healthy: boolean;
  /** 提供商状态 */
  status: ProviderStatus;
  /** 最后一次检查时间 */
  lastChecked: string;
  /** 响应时间 (ms) */
  responseTimeMs?: number;
  /** 错误信息 */
  error?: string;
  /** 剩余配额 */
  quotaRemaining?: number;
  /** 配额重置时间 */
  quotaResetAt?: string;
}

// ============================================================================
// ProviderError — 提供商错误
// ============================================================================

export class ProviderError extends Error {
  public readonly providerName: string;
  public readonly method: string;
  public readonly isRetryable: boolean;
  public readonly statusCode?: number;

  constructor(
    providerName: string,
    method: string,
    message: string,
    options?: { isRetryable?: boolean; statusCode?: number; cause?: Error },
  ) {
    super(message);
    this.name = 'ProviderError';
    this.providerName = providerName;
    this.method = method;
    this.isRetryable = options?.isRetryable ?? true;
    this.statusCode = options?.statusCode;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

// ============================================================================
// IBaseProvider — 所有 Provider 的基接口
// ============================================================================

export interface IBaseProvider {
  /** Provider 唯一标识名 */
  readonly name: string;
  /** Provider 版本号 */
  readonly version: string;
  /** 每次调用成本（美元） */
  readonly costPerCall: number;
  /** 速率限制配置 */
  readonly rateLimit: { max: number; windowMs: number };
  /** 提供商状态 */
  readonly status: ProviderStatus;
  /** 初始化（连接/认证/预热） */
  initialize(): Promise<void>;
  /** 销毁（关闭连接/清理资源） */
  shutdown(): Promise<void>;
  /** 健康检查 */
  healthCheck(): Promise<ProviderHealth>;
}

// ============================================================================
// 1. ISerpProvider — SERP 搜索能力
// ============================================================================

export interface ISerpProvider extends IBaseProvider {
  /** 标准 SERP 查询 */
  getSerp(params: SerpParams): Promise<SerpResult>;
  /** 本地搜索包（Local Pack） */
  getSerpLocal(params: LocalSerpParams): Promise<LocalSerpResult>;
  /** 新闻 SERP */
  getSerpNews(params: NewsSerpParams): Promise<NewsSerpResult>;
  /** 购物 SERP */
  getSerpShopping(params: ShoppingSerpParams): Promise<ShoppingSerpResult>;
  /** 图片 SERP */
  getSerpImages(params: ImageSerpParams): Promise<ImageSerpResult>;
  /** 视频 SERP */
  getSerpVideo(params: VideoSerpParams): Promise<VideoSerpResult>;
  /** SERP 特征检测（featured_snippet, PAA, knowledge_panel 等） */
  getSerpFeatures(params: SerpParams): Promise<SerpFeatureResult>;
  /** 获取支持的国家/地区列表 */
  getLocations(): Promise<Location[]>;
  /** 获取支持的语言列表 */
  getLanguages(): Promise<Language[]>;
}

// ============================================================================
// 2. IKeywordDataProvider — 关键词数据能力
// ============================================================================

export interface IKeywordDataProvider extends IBaseProvider {
  /** 批量获取关键词搜索量 */
  getVolume(keywords: string[], params?: KeywordParams): Promise<KeywordVolumeResult[]>;
  /** 获取相关关键词 */
  getRelated(keyword: string, params?: KeywordParams): Promise<RelatedKeyword[]>;
  /** 获取搜索建议（自动补全） */
  getSuggestions(keyword: string, params?: KeywordParams): Promise<KeywordSuggestion[]>;
  /** 获取关键词创意 */
  getIdeas(params: KeywordIdeaParams): Promise<KeywordIdea[]>;
  /** 批量获取关键词难度 */
  getDifficulty(keywords: string[]): Promise<KeywordDifficulty[]>;
  /** 获取关键词搜索量历史趋势 */
  getVolumeHistory(keyword: string, params?: KeywordParams): Promise<VolumeHistoryPoint[]>;
}

// ============================================================================
// 3. IBacklinkProvider — 外链分析能力
// ============================================================================

export interface IBacklinkProvider extends IBaseProvider {
  /** 域名外链总览 */
  getOverview(domain: string): Promise<BacklinkOverview>;
  /** 获取外链列表 */
  getBacklinks(domain: string, params?: BacklinkParams): Promise<BacklinkItem[]>;
  /** 获取引用域名列表 */
  getRefDomains(domain: string, params?: BacklinkParams): Promise<RefDomain[]>;
  /** 获取锚文本分布 */
  getAnchors(domain: string): Promise<AnchorItem[]>;
  /** 获取高质量外链（Top Backlinks） */
  getTopBacklinks(domain: string): Promise<BacklinkItem[]>;
  /** 获取新增外链 */
  getNewBacklinks(domain: string, since: Date): Promise<BacklinkItem[]>;
  /** 获取丢失外链 */
  getLostBacklinks(domain: string, since: Date): Promise<BacklinkItem[]>;
  /** 竞品外链交集（Clique Hunter） */
  getCliqueHunter(domains: string[]): Promise<BacklinkItem[]>;
}

// ============================================================================
// 4. IDomainDataProvider — 域名数据分析能力
// ============================================================================

export interface IDomainDataProvider extends IBaseProvider {
  /** 域名整体数据总览 */
  getOverview(domain: string): Promise<DomainOverview>;
  /** 获取域名自然搜索关键词 */
  getOrganicKeywords(domain: string, params?: DomainParams): Promise<OrganicKeyword[]>;
  /** 获取域名付费搜索关键词 */
  getPaidKeywords(domain: string, params?: DomainParams): Promise<PaidKeyword[]>;
  /** 流量估算 */
  getTraffic(domain: string): Promise<TrafficEstimate>;
  /** 获取竞品域名列表 */
  getCompetitors(domain: string): Promise<CompetitorInfo[]>;
}

// ============================================================================
// 5. IChatProvider — AI 对话能力
// ============================================================================

export interface IChatProvider extends IBaseProvider {
  /** 标准对话 */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  /** 结构化 JSON 输出（function calling → JSON schema） */
  chatJSON<T>(messages: ChatMessage[], schema: string): Promise<T>;
  /** 工具调用（带 function calling） */
  chatTools(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ToolCallResponse>;
  /** 流式对话 */
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>;
}

// ============================================================================
// 6. IEmbeddingProvider — 文本向量化能力
// ============================================================================

export interface IEmbeddingProvider extends IBaseProvider {
  /** 单文本向量化 */
  embed(text: string): Promise<number[]>;
  /** 批量文本向量化 */
  batchEmbed(texts: string[]): Promise<number[][]>;
  /** 获取向量维度 */
  getDimensions(): number;
}

// ============================================================================
// 7. IAudioProvider — 音频处理能力
// ============================================================================

export interface IAudioProvider extends IBaseProvider {
  /** 语音转文字 */
  transcribe(audioBuffer: Buffer, options?: TranscribeOptions): Promise<TranscriptionResult>;
  /** 文字转语音 */
  speak(text: string, options?: SpeakOptions): Promise<Buffer>;
}

// ============================================================================
// 8. IPerformanceProvider — 网站性能分析能力
// ============================================================================

export interface IPerformanceProvider extends IBaseProvider {
  /** 运行 Lighthouse 性能审计 */
  runAudit(url: string, options?: AuditOptions): Promise<PerformanceAudit>;
  /** 获取 Chrome UX Report 数据 */
  getCrUX(url: string): Promise<CrUXData>;
}

// ============================================================================
// 9. ISearchConsoleProvider — Google Search Console 能力
// ============================================================================

export interface ISearchConsoleProvider extends IBaseProvider {
  /** 获取搜索查询数据 */
  getQueries(params: GSCQueryParams): Promise<GSCQueryResult[]>;
  /** 获取页面维度数据 */
  getPages(params: GSCQueryParams): Promise<GSCPageResult[]>;
  /** 获取国家维度数据 */
  getCountries(params: GSCQueryParams): Promise<GSCCountryResult[]>;
  /** 获取设备维度数据 */
  getDevices(params: GSCQueryParams): Promise<GSCDeviceResult[]>;
  /** 检查 URL 索引状态 */
  inspectUrl(url: string): Promise<UrlInspectionResult>;
  /** 获取已提交的 Sitemap 列表 */
  getSitemaps(): Promise<SitemapInfo[]>;
  /** 提交 Sitemap */
  submitSitemap(url: string): Promise<void>;
  /** 获取已验证的站点列表 */
  getSites(): Promise<SiteInfo[]>;
}

// ============================================================================
// 10. IAnalyticsProvider — 网站分析能力
// ============================================================================

export interface IAnalyticsProvider extends IBaseProvider {
  /** 获取分析报告 */
  getReport(params: AnalyticsParams): Promise<AnalyticsReport>;
  /** 获取实时数据 */
  getRealtime(): Promise<RealtimeData>;
  /** 获取元数据（维度/指标列表） */
  getMetadata(): Promise<MetadataInfo>;
}

// ============================================================================
// 11. IIndexingProvider — 索引提交能力
// ============================================================================

export interface IIndexingProvider extends IBaseProvider {
  /** 提交单个 URL 进行索引 */
  submitUrl(url: string, type?: 'URL_UPDATED' | 'URL_DELETED'): Promise<IndexingResult>;
  /** 查询 URL 索引状态 */
  getStatus(url: string): Promise<IndexingStatus>;
  /** 批量提交 URL */
  batchSubmit(urls: string[]): Promise<BatchIndexingResult>;
}

// ============================================================================
// 12. INlpProvider — 自然语言处理能力
// ============================================================================

export interface INlpProvider extends IBaseProvider {
  /** 实体识别 */
  analyzeEntities(text: string): Promise<EntityResult[]>;
  /** 情感分析 */
  analyzeSentiment(text: string): Promise<SentimentResult>;
  /** 文本分类 */
  classifyText(text: string): Promise<CategoryResult[]>;
  /** 语法分析 */
  analyzeSyntax(text: string): Promise<SyntaxResult>;
}

// ============================================================================
// 13. ITrendProvider — 趋势分析能力
// ============================================================================

export interface ITrendProvider extends IBaseProvider {
  /** 获取关键词趋势数据 */
  getTrend(keywords: string[], params?: TrendParams): Promise<TrendData>;
  /** 获取相关查询 */
  getRelatedQueries(keyword: string): Promise<RelatedQuery[]>;
  /** 获取相关话题 */
  getRelatedTopics(keyword: string): Promise<RelatedTopic[]>;
  /** 获取地区分布 */
  getRegional(keyword: string): Promise<RegionalData[]>;
  /** 获取热门搜索 */
  getTrending(params?: TrendingParams): Promise<TrendingSearch[]>;
}

// ============================================================================
// 14. IWhoisProvider — 域名信息查询能力
// ============================================================================

export interface IWhoisProvider extends IBaseProvider {
  /** 查询单个域名 WHOIS 信息 */
  lookup(domain: string): Promise<WhoisResult>;
  /** 查询域名 WHOIS 历史 */
  getHistory(domain: string): Promise<WhoisHistory[]>;
  /** 批量查询域名 */
  bulkLookup(domains: string[]): Promise<WhoisResult[]>;
}

// ============================================================================
// 15. ICaptchaSolver — 验证码解决能力
// ============================================================================

export interface ICaptchaSolver extends IBaseProvider {
  /** 解决验证码 */
  solve(params: CaptchaParams): Promise<CaptchaSolution>;
  /** 解决音频验证码 */
  solveAudio(audioUrl: string): Promise<string>;
}

// ============================================================================
// 16. INotificationProvider — 通知发送能力
// ============================================================================

export interface INotificationProvider extends IBaseProvider {
  /** 发送单条通知 */
  send(message: NotificationMessage): Promise<void>;
  /** 批量发送通知 */
  sendBatch(messages: NotificationMessage[]): Promise<void>;
}

// ============================================================================
// CapabilityMap — 能力名到接口类型的精确映射
// 用于注册表的类型安全: registry.get<CapabilityMap['serp']>('serp')
// ============================================================================

export interface CapabilityMap {
  serp: ISerpProvider;
  keywordData: IKeywordDataProvider;
  backlink: IBacklinkProvider;
  domainData: IDomainDataProvider;
  chat: IChatProvider;
  embedding: IEmbeddingProvider;
  audio: IAudioProvider;
  performance: IPerformanceProvider;
  searchConsole: ISearchConsoleProvider;
  analytics: IAnalyticsProvider;
  indexing: IIndexingProvider;
  nlp: INlpProvider;
  trend: ITrendProvider;
  whois: IWhoisProvider;
  captcha: ICaptchaSolver;
  notification: INotificationProvider;
}

export type CapabilityName = keyof CapabilityMap;
export type AnyProvider = CapabilityMap[CapabilityName];

// ============================================================================
// 能力名称常量
// ============================================================================

export const CAPABILITIES = {
  SERP: 'serp',
  KEYWORD_DATA: 'keywordData',
  BACKLINK: 'backlink',
  DOMAIN_DATA: 'domainData',
  CHAT: 'chat',
  EMBEDDING: 'embedding',
  AUDIO: 'audio',
  PERFORMANCE: 'performance',
  SEARCH_CONSOLE: 'searchConsole',
  ANALYTICS: 'analytics',
  INDEXING: 'indexing',
  NLP: 'nlp',
  TREND: 'trend',
  WHOIS: 'whois',
  CAPTCHA: 'captcha',
  NOTIFICATION: 'notification',
} as const satisfies Record<string, CapabilityName>;

// ============================================================================
// ProviderInfo — 注册表中 Provider 的元信息
// ============================================================================

export interface ProviderInfo {
  /** 能力名称 */
  capability: CapabilityName;
  /** Provider 名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 优先级（越高越优先） */
  priority: number;
  /** 是否启用 */
  enabled: boolean;
  /** 每次调用成本 */
  costPerCall: number;
  /** 熔断器状态 */
  circuitState: string;
  /** 提供商状态 */
  status: ProviderStatus;
  /** 速率限制 */
  rateLimit: { max: number; windowMs: number };
}

// ============================================================================
// ProviderConfig — Provider 注册配置
// ============================================================================

export interface ProviderConfig {
  /** 优先级，默认 0，越高越优先 */
  priority?: number;
  /** 是否启用 */
  enabled?: boolean;
  /** 特性开关名称 */
  featureFlag?: string;
  /** 自定义熔断器配置 */
  circuitBreaker?: {
    windowMs?: number;
    failureThreshold?: number;
    resetTimeoutMs?: number;
  };
  /** 自定义速率限制 */
  rateLimit?: { max: number; windowMs: number };
}