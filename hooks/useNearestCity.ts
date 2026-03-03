/**
 * useNearestCity — Free GPS-based location detection.
 *
 * Uses expo-location (Apple Maps on iOS, Google Maps on Android, browser
 * Geolocation on web) to:
 *   1. Request foreground location permission
 *   2. Get current GPS coordinates
 *   3. Reverse-geocode to a city + region (state)
 *   4. Fuzzy-match against the Firestore-backed city list from useLocations()
 *   5. Fall back to the state capital if the suburb isn't in our list
 *
 * No API keys required. Completely free on all platforms.
 */

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { useLocations } from './useLocations';
import { findNearestPostcodes } from '@shared/location/australian-postcodes';

// ---------------------------------------------------------------------------
// Region name (as returned by reverseGeocodeAsync) → state code
// ---------------------------------------------------------------------------

const REGION_TO_CODE: Record<string, string> = {
  'new south wales':               'NSW',
  'victoria':                      'VIC',
  'queensland':                    'QLD',
  'western australia':             'WA',
  'south australia':               'SA',
  'tasmania':                      'TAS',
  'australian capital territory':  'ACT',
  'northern territory':            'NT',
};

// Fallback: if the detected suburb isn't in our city list, use the capital.
const STATE_CAPITALS: Record<string, string> = {
  NSW: 'Sydney',
  VIC: 'Melbourne',
  QLD: 'Brisbane',
  WA:  'Perth',
  SA:  'Adelaide',
  TAS: 'Hobart',
  ACT: 'Canberra',
  NT:  'Darwin',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DetectStatus =
  | 'idle'
  | 'requesting'
  | 'success'
  | 'denied'       // permission denied
  | 'unavailable'  // location services disabled
  | 'error';       // unexpected error / no match found

export interface NearestCityResult {
  city: string;
  stateCode: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNearestCity() {
  const { citiesByState } = useLocations();
  const [status, setStatus] = useState<DetectStatus>('idle');
  const [result, setResult] = useState<NearestCityResult | null>(null);

  const detect = useCallback(async (): Promise<NearestCityResult | null> => {
    setStatus('requesting');
    try {
      // Check location services are on (skipped on web — handled gracefully)
      const hasServices = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!hasServices) {
        setStatus('unavailable');
        return null;
      }

      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;

      const addresses = await Location.reverseGeocodeAsync({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      const geo = addresses[0];

      // Match region (state) name to our state code
      let stateCode = '';
      if (geo?.region) {
        const regionLower = geo.region.toLowerCase();
        stateCode = REGION_TO_CODE[regionLower] ?? '';
      }

      // Fallback to shared postcode dataset when region or reverse geocode is incomplete
      if (!stateCode || !geo) {
        const nearest = findNearestPostcodes(latitude, longitude, 1)[0];
        if (!nearest) {
          setStatus('error');
          return null;
        }

        const stateCities = citiesByState[nearest.state_code] ?? [];
        const matchedFromPostcode = stateCities.find(
          (c) => c.toLowerCase() === nearest.place_name.toLowerCase(),
        );

        const fallbackCity = matchedFromPostcode
          ?? STATE_CAPITALS[nearest.state_code]
          ?? stateCities[0]
          ?? nearest.place_name;

        if (!fallbackCity) {
          setStatus('error');
          return null;
        }

        const fallbackResult: NearestCityResult = {
          city: fallbackCity,
          stateCode: nearest.state_code,
        };

        setResult(fallbackResult);
        setStatus('success');
        return fallbackResult;
      }

      const stateCities = citiesByState[stateCode] ?? [];

      // Try several fields reverseGeocodeAsync returns, in priority order.
      // On iOS/Android: city = suburb/city, subregion = council, name = POI name
      const candidates = [geo.city, geo.subregion, geo.name].filter(Boolean) as string[];

      let matchedCity: string | null = null;
      for (const candidate of candidates) {
        const found = stateCities.find(
          (c) => c.toLowerCase() === candidate.toLowerCase(),
        );
        if (found) {
          matchedCity = found;
          break;
        }
      }

      // If the detected suburb isn't in our curated list, fall back to capital
      const city = matchedCity ?? STATE_CAPITALS[stateCode] ?? stateCities[0];
      if (!city) {
        setStatus('error');
        return null;
      }

      const r: NearestCityResult = { city, stateCode };
      setResult(r);
      setStatus('success');
      return r;
    } catch {
      setStatus('error');
      return null;
    }
  }, [citiesByState]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
  }, []);

  return { detect, result, status, reset };
}
