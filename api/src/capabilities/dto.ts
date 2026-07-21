// ============================================================================
// Crane SEO Platform — 能力接口 DTO 类型定义
// 文件: src/capabilities/dto.ts
// 包含 interfaces.ts 中所有接口引用的参数和返回值类型
// ============================================================================

// ═══════════════════════════════════════════════════════════════════════════════
// 通用类型
// ═══════════════════════════════════════════════════════════════════════════════

/** 国家/地区 */
export interface Location {
  /** 国家代码 (ISO 3166-1 alpha-2) */
  code: string;
  /** 国家名称 */
  name: string;
  /** 国家名称（本地语言） */
  nameLocal?: string;
  /** 时区 */
  timezone?: string;
}

/** 语言 */
export interface Language {
  /** 语言代码 */
  code: string;
  /** 语言名称 */
  name: string;
}

/** 日期范围 */
export interface DateRange {
  /** 开始日期 (YYYY-MM-DD) */
  startDate: string;
  /** 结束日期 (YYYY-MM-DD) */
  endDate: string;
}

/** 排序方向 */
export type SortOrder = 'asc' | 'desc';

/** 排序参数 */
export interface SortParams {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  order: SortOrder;
}

/** 分页参数 */
export interface PaginationParams {
  /** 页码 (从 1 开始) */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 偏移量（不推荐，优先使用 page） */
  offset?: number;
}

/** 分页结果 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  items: T[];
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
}

/** 批量操作结果 */
export interface BatchResult<T> {
  /** 成功数 */
  successCount: number;
  /** 失败数 */
  failureCount: number;
  /** 详细结果 */
  items: Array<{
    /** 输入项标识 */
    identifier: string;
    /** 是否成功 */
    success: boolean;
    /** 结果数据（成功时） */
    data?: T;
    /** 错误信息（失败时） */
    error?: string;
  }>;
}

/** 错误详情 */
export interface ErrorDetail {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 相关字段 */
  field?: string;
  /** 建议修复 */
  suggestion?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SERP 相关 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface SerpParams {
  /** 关键词 */
  keyword: string;
  /** 搜索引擎 (google/bing/yahoo) */
  engine?: string;
  /** 目标国家代码 */
  locationCode?: string;
  /** 目标语言代码 */
  languageCode?: string;
  /** 设备类型 */
  device?: 'desktop' | 'mobile' | 'tablet';
  /** 深度（返回结果数量） */
  depth?: number;
  /** 操作系统 */
  os?: string;
}

export interface SerpResultItem {
  /** 排名位置 */
  position: number;
  /** 页面标题 */
  title: string;
  /** 页面 URL */
  url: string;
  /** 显示 URL */
  displayUrl?: string;
  /** 描述/摘要 */
  description: string;
  /** 是否为广告 */
  isAd?: boolean;
  /** 缩略图 URL */
  thumbnail?: string;
  /** 面包屑导航 */
  breadcrumb?: string;
  /** 扩展信息（评分、价格等） */
  extensions?: string[];
  /** 发布日期 */
  date?: string;
}

export interface SerpResult {
  /** 关键词 */
  keyword: string;
  /** 搜索引擎 */
  engine: string;
  /** 搜索地点 */
  location: string;
  /** 设备 */
  device: string;
  /** 搜索结果总数 */
  totalResults?: number;
  /** 搜索耗时（秒） */
  searchTime?: number;
  /** 结果项列表 */
  items: SerpResultItem[];
  /** 原始响应 */
  raw?: Record<string, unknown>;
}

export interface LocalSerpParams extends SerpParams {
  /** 纬度 */
  lat?: number;
  /** 经度 */
  lng?: number;
  /** 搜索半径（米） */
  radius?: number;
}

export interface LocalSerpResultItem {
  position: number;
  title: string;
  address: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  url?: string;
  geo?: { lat: number; lng: number };
}

export interface LocalSerpResult {
  keyword: string;
  location: string;
  items: LocalSerpResultItem[];
  mapCenter?: { lat: number; lng: number };
}

export interface NewsSerpParams extends SerpParams {
  /** 新闻主题 */
  topic?: string;
  /** 时间范围 */
  dateRange?: string;
}

export interface NewsSerpResult {
  keyword: string;
  items: Array<{
    position: number;
    title: string;
    url: string;
    source: string;
    date: string;
    snippet: string;
    thumbnail?: string;
  }>;
}

export interface ShoppingSerpParams extends SerpParams {
  /** 价格范围 */
  minPrice?: number;
  maxPrice?: number;
  /** 排序方式 */
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating';
}

export interface ShoppingSerpResult {
  keyword: string;
  items: Array<{
    position: number;
    title: string;
    url: string;
    price: number;
    oldPrice?: number;
    currency: string;
    merchant: string;
    rating?: number;
    reviewCount?: number;
    thumbnail?: string;
    shipping?: string;
  }>;
}

export interface ImageSerpParams extends SerpParams {
  /** 图片尺寸 */
  size?: 'large' | 'medium' | 'icon';
  /** 颜色 */
  color?: string;
  /** 图片类型 */
  type?: 'photo' | 'clipart' | 'line' | 'animated';
}

export interface ImageSerpResult {
  keyword: string;
  items: Array<{
    position: number;
    title: string;
    imageUrl: string;
    thumbnailUrl: string;
    sourceUrl: string;
    source: string;
    width: number;
    height: number;
  }>;
}

export interface VideoSerpParams extends SerpParams {
  /** 视频时长 */
  duration?: 'short' | 'medium' | 'long';
  /** 视频质量 */
  quality?: 'hd' | '4k';
}

export interface VideoSerpResult {
  keyword: string;
  items: Array<{
    position: number;
    title: string;
    url: string;
    thumbnail: string;
    source: string;
    duration: string;
    views?: number;
    date?: string;
  }>;
}

export interface SerpFeatureResult {
  keyword: string;
  features: Array<{
    type: 'featured_snippet' | 'paa' | 'knowledge_panel' | 'local_pack' | 'video' | 'sitelinks' | 'image_pack' | 'shopping' | 'ads';
    position: number;
    url?: string;
    title?: string;
    data: Record<string, unknown>;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 关键词数据 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface KeywordParams {
  /** 国家代码 */
  locationCode?: string;
  /** 语言代码 */
  languageCode?: string;
  /** 是否包含成人关键词 */
  includeAdult?: boolean;
  /** 搜索源 */
  searchEngine?: string;
}

export interface KeywordVolumeResult {
  /** 关键词 */
  keyword: string;
  /** 月搜索量 */
  searchVolume: number;
  /** 建议出价 (CPC) */
  cpc: number | null;
  /** 竞争度 (0-100) */
  competition: number | null;
  /** 竞争度索引 */
  competitionIndex?: number;
  /** 低范围搜索量 */
  lowRange?: number;
  /** 高范围搜索量 */
  highRange?: number;
}

export interface RelatedKeyword {
  keyword: string;
  relevance: number;
  searchVolume: number;
  cpc: number | null;
  competition: number | null;
}

export interface KeywordSuggestion {
  keyword: string;
  suggestion: string;
  type: string;
}

export interface KeywordIdeaParams {
  /** 种子关键词 */
  seedKeyword: string;
  /** 目标国家 */
  locationCode?: string;
  /** 目标语言 */
  languageCode?: string;
  /** 最小搜索量 */
  minVolume?: number;
  /** 最大搜索量 */
  maxVolume?: number;
  /** 排除已有品牌词 */
  excludeBrands?: boolean;
  /** 返回结果数量限制 */
  limit?: number;
}

export interface KeywordIdea {
  keyword: string;
  searchVolume: number;
  cpc: number | null;
  competition: number | null;
  competitionIndex: number;
  categories: string[];
  /** 关键词趋势（12个月） */
  monthlySearches?: Array<{ month: string; count: number }>;
}

export interface KeywordDifficulty {
  keyword: string;
  difficulty: number;
  /** 顶部结果的平均 backlink 数 */
  avgBacklinks?: number;
  /** 顶部结果的平均域名评分 */
  avgDomainRating?: number;
  /** 难度细分 */
  breakdown?: {
    backlinksWeight: number;
    domainRatingWeight: number;
    contentWeight: number;
  };
}

export interface VolumeHistoryPoint {
  /** 月份 (YYYY-MM) */
  month: string;
  /** 搜索量 */
  volume: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 外链 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface BacklinkParams extends PaginationParams {
  /** 排序方式 */
  sortBy?: 'domain_rating' | 'page_rating' | 'first_seen' | 'last_seen';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 链接类型过滤 */
  linkType?: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc';
  /** 最小域名评分 */
  minDomainRating?: number;
  /** 是否只返回活跃链接 */
  onlyActive?: boolean;
}

export interface BacklinkOverview {
  domain: string;
  /** 总外链数 */
  totalBacklinks: number;
  /** 引用域名数 */
  refDomains: number;
  /** 引用 IP 数 */
  refIPs?: number;
  /** 引用子网数 */
  refSubnets?: number;
  /** dofollow 外链数 */
  dofollow: number;
  /** nofollow 外链数 */
  nofollow: number;
  /** 域名评分 */
  domainRating?: number;
  /** 信任评分 */
  trustScore?: number;
  /** 外链趋势 */
  trend?: Array<{ date: string; count: number }>;
}

export interface BacklinkItem {
  /** 来源页面 URL */
  sourceUrl: string;
  /** 目标页面 URL */
  targetUrl: string;
  /** 锚文本 */
  anchor: string;
  /** 链接类型 */
  linkType: 'dofollow' | 'nofollow' | 'sponsored' | 'ugc';
  /** 域名评分 */
  domainRating?: number;
  /** 页面评分 */
  pageRating?: number;
  /** 来源页面标题 */
  sourceTitle?: string;
  /** 首次发现时间 */
  firstSeen: string;
  /** 最后发现时间 */
  lastSeen: string;
  /** 状态 */
  status: 'active' | 'lost';
  /** 链接上下文（周围文本） */
  context?: string;
}

export interface RefDomain {
  /** 域名 */
  domain: string;
  /** 外链数量 */
  backlinkCount: number;
  /** 域名评分 */
  domainRating?: number;
  /** 首次引用时间 */
  firstSeen: string;
  /** 是否已验证 */
  isVerified?: boolean;
}

export interface AnchorItem {
  /** 锚文本 */
  anchor: string;
  /** 使用次数 */
  count: number;
  /** 引用域名数 */
  refDomains: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 域名数据 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface DomainParams {
  /** 国家代码 */
  locationCode?: string;
  /** 语言代码 */
  languageCode?: string;
  /** 是否包含子域名 */
  includeSubdomains?: boolean;
}

export interface DomainOverview {
  domain: string;
  /** 自然搜索流量 */
  organicTraffic: number;
  /** 付费搜索流量 */
  paidTraffic?: number;
  /** 自然关键词数 */
  organicKeywords: number;
  /** 付费关键词数 */
  paidKeywords?: number;
  /** 外链数 */
  backlinks?: number;
  /** 引用域名数 */
  refDomains?: number;
  /** 域名评分 */
  domainRating?: number;
  /** 预估流量价值 */
  trafficValue?: number;
  /** 流量趋势 */
  trafficTrend?: Array<{ month: string; traffic: number }>;
  /** 顶级关键词 */
  topKeywords?: OrganicKeyword[];
}

export interface OrganicKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  traffic: number;
  /** 流量占比 */
  trafficShare: number;
  url: string;
  /** 排名变化 */
  positionChange?: number;
  /** 搜索意图 */
  intent?: string;
  cpc?: number;
}

export interface PaidKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  cpc: number;
  url: string;
  /** 广告标题 */
  adTitle?: string;
  /** 广告描述 */
  adDescription?: string;
}

export interface TrafficEstimate {
  domain: string;
  /** 月均自然流量 */
  monthlyOrganicTraffic: number;
  /** 月均付费流量 */
  monthlyPaidTraffic?: number;
  /** 流量趋势 */
  trend?: Array<{ month: string; organic: number; paid: number }>;
  /** 流量来源国家分布 */
  countries?: Array<{ country: string; traffic: number; share: number }>;
}

export interface CompetitorInfo {
  domain: string;
  /** 共享关键词数 */
  commonKeywords: number;
  /** 竞争度 */
  competitionLevel: 'low' | 'medium' | 'high';
  /** 流量 */
  organicTraffic?: number;
  /** 关键词数 */
  organicKeywords?: number;
  /** 域名评分 */
  domainRating?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AI 对话 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface ChatOptions {
  /** 模型名称 */
  model?: string;
  /** 温度 (0-2) */
  temperature?: number;
  /** Top P 采样 */
  topP?: number;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 停止词 */
  stop?: string[];
  /** 频率惩罚 */
  frequencyPenalty?: number;
  /** 存在惩罚 */
  presencePenalty?: number;
}

export interface ChatResponse {
  /** 角色 */
  role: 'assistant';
  /** 回复内容 */
  content: string | null;
  /** 工具调用 */
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  /** Token 用量 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 完成原因 */
  finishReason?: string;
}

export interface ToolDefinition {
  /** 函数名 */
  name: string;
  /** 函数描述 */
  description: string;
  /** JSON Schema 参数 */
  parameters: Record<string, unknown>;
}

export interface ToolCallResponse extends ChatResponse {
  toolCalls: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. 音频 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface TranscribeOptions {
  /** 音频语言 */
  language?: string;
  /** 是否启用时间戳 */
  timestamps?: boolean;
  /** 响应格式 */
  responseFormat?: 'json' | 'text' | 'srt' | 'vtt';
  /** 提示词（改善转录质量） */
  prompt?: string;
}

export interface TranscriptionResult {
  /** 转录文本 */
  text: string;
  /** 语言 */
  language?: string;
  /** 时长（秒） */
  duration?: number;
  /** 分段文本 */
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export interface SpeakOptions {
  /** 语音 */
  voice?: string;
  /** 语速 (0.25-4.0) */
  speed?: number;
  /** 输出格式 */
  format?: 'mp3' | 'opus' | 'aac' | 'flac';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. 性能 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditOptions {
  /** 设备类型 */
  device?: 'desktop' | 'mobile';
  /** 网络条件 */
  throttling?: {
    rttMs?: number;
    throughputKbps?: number;
    cpuSlowdownMultiplier?: number;
  };
  /** 是否只跑指定类别 */
  categories?: Array<'performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa'>;
  /** 是否阻塞模式（等待完成后返回） */
  blocking?: boolean;
}

export interface PerformanceAudit {
  url: string;
  /** 性能评分 (0-100) */
  score: number;
  /** 核心 Web 指标 */
  metrics: {
    /** LCP (ms) */
    lcp: number;
    /** CLS */
    cls: number;
    /** INP (ms) */
    inp?: number;
    /** TTFB (ms) */
    ttfb: number;
    /** FCP (ms) */
    fcp: number;
    /** SI (ms) */
    si: number;
    /** TBT (ms) */
    tbt: number;
  };
  /** 各分类评分 */
  categories: Record<string, { score: number; title: string }>;
  /** 优化建议 */
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    score: number;
    savings?: { bytes?: number; ms?: number };
  }>;
  /** 诊断信息 */
  diagnostics: Array<{
    id: string;
    title: string;
    description: string;
    score: number;
    displayValue?: string;
  }>;
  /** 请求时间 */
  fetchTime: string;
  /** Lighthouse 版本 */
  lighthouseVersion?: string;
}

export interface CrUXData {
  url: string;
  /** 每月数据 */
  record: {
    metrics: {
      lcp?: { p75: number; histogram: Array<{ start: number; density: number }> };
      cls?: { p75: number; histogram: Array<{ start: number; density: number }> };
      inp?: { p75: number; histogram: Array<{ start: number; density: number }> };
      ttfb?: { p75: number; histogram: Array<{ start: number; density: number }> };
      fcp?: { p75: number; histogram: Array<{ start: number; density: number }> };
    };
    collectionPeriod: { firstDate: string; lastDate: string };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Google Search Console DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface GSCQueryParams {
  /** 站点 URL */
  siteUrl: string;
  /** 开始日期 (YYYY-MM-DD) */
  startDate: string;
  /** 结束日期 (YYYY-MM-DD) */
  endDate: string;
  /** 维度 */
  dimensions?: string[];
  /** 过滤条件 */
  filters?: Array<{
    dimension: string;
    operator: 'equals' | 'contains' | 'notContains' | 'includingRegex' | 'excludingRegex';
    expression: string;
  }>;
  /** 行数限制 */
  rowLimit?: number;
  /** 排序维度 */
  orderBy?: string;
  /** 排序方向 */
  orderDirection?: 'ascending' | 'descending';
}

export interface GSCQueryResult {
  /** 关键词 */
  query: string;
  /** 点击次数 */
  clicks: number;
  /** 展示次数 */
  impressions: number;
  /** 点击率 */
  ctr: number;
  /** 平均排名 */
  position: number;
}

export interface GSCPageResult {
  /** 页面 URL */
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCCountryResult {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCDeviceResult {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface UrlInspectionResult {
  url: string;
  /** 索引状态 */
  indexStatus: 'INDEXED' | 'NOT_INDEXED' | 'BLOCKED' | 'ERROR';
  /** 上次爬取时间 */
  lastCrawlTime?: string;
  /** 用户声明的规范 URL */
  userCanonical?: string;
  /** Google 选择的规范 URL */
  googleCanonical?: string;
  /** 移动可用性 */
  mobileUsability?: string;
  /** 丰富结果 */
  richResults?: string[];
  /** 抓取错误 */
  crawlErrors?: string[];
}

export interface SitemapInfo {
  /** Sitemap 路径 */
  path: string;
  /** 最后提交时间 */
  lastSubmitted: string;
  /** 是否待处理 */
  isPending: boolean;
  /** 是否被 Sitemap 索引引用 */
  isSitemapsIndex: boolean;
  /** 包含的 URL 数量 */
  urlCount?: number;
  /** 警告 */
  warnings?: number;
  /** 错误 */
  errors?: number;
}

export interface SiteInfo {
  /** 站点 URL */
  siteUrl: string;
  /** 权限级别 */
  permissionLevel: 'siteOwner' | 'siteFullUser' | 'siteRestrictedUser';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. Analytics DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnalyticsParams {
  /** 属性 ID */
  propertyId: string;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 指标 */
  metrics: string[];
  /** 维度 */
  dimensions?: string[];
  /** 过滤条件 */
  filters?: string;
  /** 行数限制 */
  limit?: number;
}

export interface AnalyticsReport {
  rows: AnalyticsReportRow[];
  totals: AnalyticsReportRow;
  /** 数据采样率 */
  samplingRate?: number;
  /** 数据是黄金还是采样 */
  isDataGolden?: boolean;
}

export interface AnalyticsReportRow {
  /** 维度值 */
  dimensions: string[];
  /** 指标值 */
  metrics: Array<{ value: string }>;
}

export interface RealtimeData {
  /** 活跃用户数 */
  activeUsers: number;
  /** 页面浏览量 */
  pageViews?: number;
  /** 事件数 */
  eventCount?: number;
  /** 设备分布 */
  devices?: Array<{ device: string; count: number }>;
  /** 来源 */
  sources?: Array<{ source: string; count: number }>;
  /** 热门页面 */
  topPages?: Array<{ page: string; count: number }>;
}

export interface MetadataInfo {
  /** 可用维度 */
  dimensions: Array<{ name: string; category: string; description: string }>;
  /** 可用指标 */
  metrics: Array<{ name: string; category: string; description: string; type: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. 索引 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface IndexingResult {
  url: string;
  /** 是否成功 */
  success: boolean;
  /** 通知类型 */
  notificationType?: 'URL_UPDATED' | 'URL_DELETED';
  /** 通知提交时间 */
  notifyTime?: string;
  /** 错误信息 */
  error?: string;
}

export interface IndexingStatus {
  url: string;
  /** 上次通知时间 */
  lastNotificationTime?: string;
  /** 上次通知类型 */
  lastNotificationType?: string;
  /** 最近通知是否成功 */
  latestSuccess?: boolean;
}

export interface BatchIndexingResult {
  /** 成功数 */
  successCount: number;
  /** 失败数 */
  failureCount: number;
  /** 详细结果 */
  results: IndexingResult[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. NLP DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface EntityResult {
  /** 实体名称 */
  name: string;
  /** 实体类型 */
  type: string;
  /** 元数据（Wikipedia URL 等） */
  metadata?: Record<string, string>;
  /** 情感评分 */
  salience?: number;
  /** 提及次数 */
  mentions: Array<{
    text: string;
    sentiment?: { magnitude: number; score: number };
  }>;
}

export interface SentimentResult {
  /** 整体情感评分 (-1.0 到 1.0) */
  score: number;
  /** 情感强度 */
  magnitude: number;
  /** 按句子评分 */
  sentences?: Array<{
    text: string;
    score: number;
    magnitude: number;
  }>;
  /** 语言 */
  language: string;
}

export interface CategoryResult {
  /** 分类名称 */
  name: string;
  /** 置信度 (0-1) */
  confidence: number;
}

export interface SyntaxResult {
  /** 语言 */
  language: string;
  /** 句子 */
  sentences: Array<{
    text: string;
    tokens: Array<{
      text: string;
      partOfSpeech: { tag: string; aspect?: string; case?: string };
      dependencyEdge?: { headTokenIndex: number; label: string };
      lemma?: string;
    }>;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. 趋势 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrendParams {
  /** 时间范围 */
  timeframe?: string;
  /** 地理位置 */
  geo?: string;
  /** 类别 */
  category?: number;
  /** 搜索类型 */
  property?: 'web' | 'images' | 'news' | 'youtube' | 'shopping';
}

export interface TrendData {
  keywords: Array<{
    keyword: string;
    /** 时间序列数据 */
    timeline: Array<{
      date: string;
      value: number;
    }>;
    /** 平均值 */
    average: number;
  }>;
  /** 相关度最高的时间点 */
  peakDates?: Array<{ date: string; keyword: string; value: number }>;
}

export interface RelatedQuery {
  query: string;
  /** 搜索量相对值 */
  value: number;
  /** 类型：rising | top */
  type: 'rising' | 'top';
  /** 增长百分比（仅 rising 类型） */
  growthPercent?: number;
}

export interface RelatedTopic {
  topic: string;
  /** 话题类型 */
  type: string;
  /** 搜索量相对值 */
  value: number;
}

export interface RegionalData {
  region: string;
  /** 地区代码 */
  regionCode: string;
  /** 搜索量相对值 */
  value: number;
}

export interface TrendingParams {
  /** 地理位置 */
  geo?: string;
  /** 类别 */
  category?: string;
}

export interface TrendingSearch {
  title: string;
  /** 相关文章 */
  articles?: Array<{
    title: string;
    url: string;
    source: string;
    date: string;
    thumbnail?: string;
  }>;
  /** 搜索量趋势 */
  trend?: Array<{ date: string; value: number }>;
  /** 流量（估算） */
  traffic?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. WHOIS DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface WhoisResult {
  domain: string;
  /** 注册商 */
  registrar?: string;
  /** 创建日期 */
  creationDate?: string;
  /** 过期日期 */
  expirationDate?: string;
  /** 最后更新日期 */
  updatedDate?: string;
  /** 域名状态 */
  statuses?: string[];
  /** 名称服务器 */
  nameServers?: string[];
  /** 注册人信息 */
  registrant?: {
    name?: string;
    organization?: string;
    email?: string;
    country?: string;
  };
  /** 原始 WHOIS 数据 */
  rawText?: string;
}

export interface WhoisHistory {
  /** 记录日期 */
  date: string;
  /** 注册商 */
  registrar?: string;
  /** 域名状态 */
  statuses?: string[];
  /** 名称服务器 */
  nameServers?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. 验证码 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface CaptchaParams {
  /** 验证码类型 */
  type: 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'image' | 'audio';
  /** 网站 URL */
  siteUrl: string;
  /** 站点密钥 */
  siteKey: string;
  /** 其他参数 */
  extra?: Record<string, unknown>;
}

export interface CaptchaSolution {
  /** 解决方案 token */
  token: string;
  /** 解决耗时（秒） */
  solveTime: number;
  /** 成本 */
  cost?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 15. 通知 DTO
// ═══════════════════════════════════════════════════════════════════════════════

export interface NotificationMessage {
  /** 渠道 */
  channel: 'email' | 'dingtalk' | 'feishu' | 'slack' | 'webhook';
  /** 接收人 */
  recipient: string;
  /** 主题 */
  subject: string;
  /** 正文 */
  body: string;
  /** 优先级 */
  priority?: 'normal' | 'high' | 'urgent';
  /** 附件 */
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  /** 额外参数 */
  extra?: Record<string, unknown>;
}