// Type declarations for leaflet.markercluster
import * as L from 'leaflet';

declare module 'leaflet' {
  interface MarkerCluster extends L.Marker {
    getChildCount(): number;
    getAllChildMarkers(): L.Marker[];
    zoomToBounds(): void;
    spiderfy(): void;
    unspiderfy(): void;
  }

  interface MarkerClusterGroupOptions extends L.LayerOptions {
    maxClusterRadius?: number | ((zoom: number) => number);
    clusterPane?: string;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    singleMarkerMode?: boolean;
    disableClusteringAtZoom?: number;
    removeOutsideVisibleBounds?: boolean;
    animate?: boolean;
    animateAddingMarkers?: boolean;
    spiderfyDistanceMultiplier?: number;
    spiderLegPolylineOptions?: L.PolylineOptions;
    chunkedLoading?: boolean;
    chunkInterval?: number;
    chunkDelay?: number;
    chunkProgress?: (processed: number, total: number, elapsed: number) => void;
    polygonOptions?: L.PolylineOptions;
    iconCreateFunction?: (cluster: MarkerCluster) => L.Icon | L.DivIcon;
  }

  interface MarkerClusterGroup extends L.FeatureGroup {
    addLayer(layer: L.Layer): this;
    removeLayer(layer: L.Layer): this;
    clearLayers(): this;
    getVisibleParent(marker: L.Marker): L.Marker | MarkerCluster;
    refreshClusters(markers?: L.Marker[]): this;
    getChildCount(): number;
    getAllChildMarkers(): L.Marker[];
    hasLayer(layer: L.Layer): boolean;
    zoomToShowLayer(layer: L.Marker, callback?: () => void): void;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_MAPBOX_TOKEN?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
