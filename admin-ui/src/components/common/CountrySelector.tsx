import React, { useMemo, useState, useCallback } from 'react';
import { Select, Space, Input, Typography } from 'antd';
import { SearchOutlined, GlobalOutlined } from '@ant-design/icons';
import { useStore } from '../../store';
import type { Country } from '../../store';

const { Text } = Typography;

// ============================================================================
// Country code to ISO2 + flag emoji mapping
// DataForSEO location codes
// ============================================================================

const COUNTRY_CODE_TO_ISO2: Record<string, string> = {
  '2840': 'US',
  '2826': 'GB',
  '2276': 'DE',
  '2250': 'FR',
  '2724': 'JP',
  '2356': 'CA',
  '2036': 'AU',
  '2152': 'CN',
  '2720': 'KR',
  '2359': 'BR',
  '2484': 'IN',
  '2528': 'IT',
  '2723': 'ES',
  '2529': 'NL',
  '2756': 'SG',
  '2643': 'RU',
  '2272': 'MX',
  '2392': 'AR',
  '2752': 'SE',
  '2757': 'CH',
  '2758': 'TW',
  '2364': 'HK',
  '2804': 'AE',
  '2682': 'SA',
  '2784': 'TH',
  '2458': 'ID',
  '2704': 'MY',
  '2608': 'PH',
  '2708': 'VN',
  '2032': 'AT',
  '2056': 'BE',
  '2208': 'DK',
  '2246': 'FI',
  '2300': 'GR',
  '2372': 'IE',
  '2578': 'NO',
  '2616': 'PL',
  '2620': 'PT',
  '2792': 'TR',
  '2800': 'UA',
  '2710': 'ZA',
  '2566': 'NG',
  '2818': 'EG',
};

/**
 * 将 ISO 2 字母国家代码转换为国旗 emoji
 */
function iso2ToFlagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '';
  const codePoints = iso2
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

/**
 * 获取国家对应的国旗 emoji
 */
export function getCountryFlag(code: string): string {
  const iso2 = COUNTRY_CODE_TO_ISO2[code];
  return iso2 ? iso2ToFlagEmoji(iso2) : '';
}

// ============================================================================
// Component
// ============================================================================

export interface CountrySelectorProps {
  /** 受控值 */
  value?: string;
  /** 变更回调 */
  onChange?: (country: Country) => void;
  /** 是否同时显示搜索引擎选择 */
  showSearchEngine?: boolean;
  /** 尺寸 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义样式 */
  style?: React.CSSProperties;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  showSearchEngine = false,
  size = 'middle',
  style,
}) => {
  const {
    availableCountries,
    selectedCountry,
    selectedSearchEngine,
    setSelectedCountry,
    setSelectedSearchEngine,
    availableSearchEngines,
  } = useStore();

  const [searchText, setSearchText] = useState('');

  // 当前选中值：优先使用受控 value，否则使用 store
  const currentCountryCode = value ?? selectedCountry.code;

  // 根据搜索文本过滤国家列表
  const filteredCountries = useMemo(() => {
    const list = availableCountries.length > 0 ? availableCountries : [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.code.includes(lower) ||
        c.language.toLowerCase().includes(lower)
    );
  }, [availableCountries, searchText]);

  // 根据当前国家过滤搜索引擎
  const filteredEngines = useMemo(() => {
    if (!availableSearchEngines || availableSearchEngines.length === 0) return [];
    return availableSearchEngines.filter((e) => e.country === currentCountryCode);
  }, [availableSearchEngines, currentCountryCode]);

  // 处理国家选择
  const handleCountryChange = useCallback(
    (countryCode: string) => {
      const country = availableCountries.find((c) => c.code === countryCode);
      if (country) {
        if (onChange) {
          onChange(country);
        } else {
          setSelectedCountry(country);
          // 自动切换搜索引擎为该国家的默认引擎
          const enginesForCountry = availableSearchEngines.filter(
            (e) => e.country === countryCode
          );
          if (enginesForCountry.length > 0) {
            setSelectedSearchEngine(enginesForCountry[0]);
          }
        }
      }
    },
    [availableCountries, availableSearchEngines, onChange, setSelectedCountry, setSelectedSearchEngine]
  );

  // 处理搜索引擎选择
  const handleEngineChange = useCallback(
    (engineCode: string) => {
      const engine = availableSearchEngines.find((e) => e.code === engineCode);
      if (engine) {
        setSelectedSearchEngine(engine);
      }
    },
    [availableSearchEngines, setSelectedSearchEngine]
  );

  // 当前选中的国家对象
  const currentCountry = availableCountries.find((c) => c.code === currentCountryCode);

  return (
    <Space size={8} style={style}>
      <Select
        showSearch
        size={size}
        value={currentCountryCode}
        onChange={handleCountryChange}
        placeholder="选择国家/地区"
        style={{ minWidth: 180 }}
        optionLabelProp="label"
        filterOption={false}
        prefix={<GlobalOutlined style={{ color: '#8c8c8c' }} />}
        onSearch={(val) => setSearchText(val)}
        onBlur={() => setSearchText('')}
        onDropdownVisibleChange={(open) => {
          if (!open) setSearchText('');
        }}
        notFoundContent={
          <div style={{ padding: '8px 0', textAlign: 'center' }}>
            <Text type="secondary">未找到匹配的国家/地区</Text>
          </div>
        }
        dropdownRender={(menu) => (
          <div>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Input
                size="small"
                prefix={<SearchOutlined />}
                placeholder="搜索国家/地区..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ border: 'none' }}
                allowClear
              />
            </div>
            {menu}
          </div>
        )}
      >
        {filteredCountries.map((country) => {
          const flag = getCountryFlag(country.code);
          return (
            <Select.Option
              key={country.code}
              value={country.code}
              label={
                <span>
                  {flag && <span style={{ marginRight: 6 }}>{flag}</span>}
                  {country.name}
                </span>
              }
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {flag && <span style={{ fontSize: 16 }}>{flag}</span>}
                <span>{country.name}</span>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
                  {country.language.toUpperCase()}
                </Text>
              </span>
            </Select.Option>
          );
        })}
      </Select>

      {/* 搜索引擎选择器 */}
      {showSearchEngine && filteredEngines.length > 0 && (
        <Select
          size={size}
          value={selectedSearchEngine.code}
          onChange={handleEngineChange}
          style={{ minWidth: 130 }}
          placeholder="搜索引擎"
        >
          {filteredEngines.map((engine) => (
            <Select.Option key={engine.code} value={engine.code}>
              {engine.name}
            </Select.Option>
          ))}
        </Select>
      )}
    </Space>
  );
};

export default CountrySelector;