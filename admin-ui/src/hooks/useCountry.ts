import { useStore } from '@/store';

export function useCountry() {
  const selectedCountry = useStore(state => state.selectedCountry);
  const selectedSearchEngine = useStore(state => state.selectedSearchEngine);
  const availableCountries = useStore(state => state.availableCountries);
  const availableSearchEngines = useStore(state => state.availableSearchEngines);
  const setSelectedCountry = useStore(state => state.setSelectedCountry);
  const setSelectedSearchEngine = useStore(state => state.setSelectedSearchEngine);

  return {
    country: selectedCountry,
    countryCode: selectedCountry.code,
    countryName: selectedCountry.name,
    engine: selectedSearchEngine,
    engineCode: selectedSearchEngine.code,
    engineName: selectedSearchEngine.name,
    countries: availableCountries,
    engines: availableSearchEngines,
    setCountry: setSelectedCountry,
    setEngine: setSelectedSearchEngine,
  };
}