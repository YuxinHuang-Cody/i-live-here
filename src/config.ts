// Jeremy Bentham Room — UCL, Bloomsbury, London WC1E 6BT.
// Approx lat/lng for the South Wing / main quad of UCL.
export const INITIAL_VIEW = {
  longitude: -0.13396,
  latitude: 51.5246,
  zoom: 16.4,
  pitch: 0,
  bearing: 0,
} as const;

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// Apple-Maps-ish light style. Swap for your own studio style if you have one.
export const MAP_STYLE = 'mapbox://styles/mapbox/standard';
