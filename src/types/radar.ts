export interface RadarGeometry {
  type: string;
  coordinates: [number, number];
}

export interface RadarAddress {
  latitude: number;
  longitude: number;
  geometry: RadarGeometry;
  country: string;
  countryCode: string;
  countryFlag: string;
  county: string;
  distance: number;
  borough?: string;
  city: string;
  number: string;
  neighborhood?: string;
  postalCode: string;
  stateCode: string;
  state: string;
  street: string;
  layer: string;
  formattedAddress: string;
  placeLabel?: string;
}

export interface RadarResponse {
  meta: {
    code: number;
  };
  addresses: RadarAddress[];
} 