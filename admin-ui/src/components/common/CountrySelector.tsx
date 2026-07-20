import React, { useMemo, useState, useCallback } from 'react';
import { Select, Space, Input, Typography } from 'antd';
import { SearchOutlined, GlobalOutlined } from '@ant-design/icons';
import { useStore } from '@/store';
import type { Country } from '@/store';

const { Text } = Typography;

// ============================================================================
// Flag emoji from ISO 2-letter code
// ============================================================================

function iso2ToFlagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '';
  const codePoints = iso2
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

export function getCountryFlag(code: string, isoCode?: string): string {
  // 优先使用 isoCode（API 返回的 ISO 2 字母代码）
  if (isoCode && isoCode.length === 2) {
    return iso2ToFlagEmoji(isoCode);
  }
  return '';
}

// ============================================================================
// Component
// ============================================================================

export interface CountrySelectorProps {
  value?: string;
  onChange?: (country: Country) => void;
  showSearchEngine?: boolean;
  size?: 'small' | 'middle' | 'large';
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
    countriesLoaded,
  } = useStore();

  const [searchText, setSearchText] = useState('');

  const currentCountryCode = value ?? selectedCountry.code;

  // 根据搜索文本过滤（支持按名称、ISO代码、语言搜索）
  const filteredCountries = useMemo(() => {
    if (!searchText) return availableCountries;
    const lower = searchText.toLowerCase();
    return availableCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.code.includes(lower) ||
        c.isoCode.toLowerCase().includes(lower) ||
        c.language.toLowerCase().includes(lower)
    );
  }, [availableCountries, searchText]);

  // 当前国家对应的搜索引擎
  const filteredEngines = useMemo(() => {
    if (!availableSearchEngines || availableSearchEngines.length === 0) return [];
    return availableSearchEngines.filter((e) => e.country === currentCountryCode);
  }, [availableSearchEngines, currentCountryCode]);

  const handleCountryChange = useCallback(
    (countryCode: string) => {
      const country = availableCountries.find((c) => c.code === countryCode);
      if (country) {
        if (onChange) {
          onChange(country);
        } else {
          setSelectedCountry(country);
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

  const handleEngineChange = useCallback(
    (engineCode: string) => {
      const engine = availableSearchEngines.find((e) => e.code === engineCode);
      if (engine) setSelectedSearchEngine(engine);
    },
    [availableSearchEngines, setSelectedSearchEngine]
  );

  const currentCountry = availableCountries.find((c) => c.code === currentCountryCode);

  return (
    <Space size={8} style={style}>
      <Select
        showSearch
        size={size}
        value={currentCountryCode}
        onChange={handleCountryChange}
        placeholder="选择国家/地区"
        style={{ minWidth: 200 }}
        optionLabelProp="label"
        filterOption={false}
        prefix={<GlobalOutlined style={{ color: '#8c8c8c' }} />}
        loading={!countriesLoaded}
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
            {!countriesLoaded && (
              <div style={{ padding: '8px 12px', textAlign: 'center', color: '#999' }}>
                正在加载全部国家...
              </div>
            )}
          </div>
        )}
      >
        {filteredCountries.map((country) => {
          const flag = getCountryFlag(country.code, country.isoCode);
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
                  {country.isoCode}
                </Text>
              </span>
            </Select.Option>
          );
        })}
      </Select>

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