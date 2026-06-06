import { useEffect } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapClickHandler({ onLocationPick }) {
  useMapEvents({
    click(event) {
      onLocationPick({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });
  return null;
}

function MapViewSync({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.flyTo([center.lat, center.lng], zoom, { duration: 0.6 });
  }, [center, zoom, map]);

  return null;
}

export default function BranchLocationMap({
  latitude,
  longitude,
  radiusMeters,
  onLocationPick,
}) {
  const hasPin =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0);

  const center = hasPin
    ? { lat: latitude, lng: longitude }
    : DEFAULT_CENTER;

  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={hasPin ? 16 : 11}
        scrollWheelZoom
        className="z-0 h-[360px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onLocationPick={onLocationPick} />
        <MapViewSync center={hasPin ? center : null} zoom={16} />
        {hasPin ? (
          <>
            <Marker position={[latitude, longitude]} />
            <Circle
              center={[latitude, longitude]}
              radius={radiusMeters}
              pathOptions={{
                color: "#0f172a",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
                weight: 2,
              }}
            />
          </>
        ) : null}
      </MapContainer>
    </div>
  );
}
