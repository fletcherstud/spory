import axiosClient from './axiosClient';

const RADAR_API_KEY = process.env.RADAR_API_KEY;
const RADAR_BASE_URL = 'https://api.radar.io/v1';

interface SearchParams {
  query: string;
  near?: string;
  layers?: string;
  limit?: number;
  countryCode?: string;
  lang?: string;
}

export const searchLocations = async (params: SearchParams) => {
  const response = await axiosClient.get(`${RADAR_BASE_URL}/search/autocomplete`, {
    params: {
      ...params,
      // Use multiple layers to get cities, counties, and other administrative areas
      layers: 'locality',
      limit: 5
    },
    headers: {
      'Authorization': RADAR_API_KEY
    }
  });
  
  return response.data;
}; 