import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowDown, ArrowUp, Bike, Car, ChevronLeft, ChevronRight, Clock3, Home, LocateFixed, MapPinned, Minus, Navigation, Plane, Plus, Route, X } from "lucide-react";
import { tripDays } from "../data/tripData";
import { STAY_TYPES, getRouteStopsForDay } from "../utils/routes";

const dayColor = "#0A7C7C";

export default function MapPage({ activities, selectedPlace, selectedDay, onSelectDay, onSelectPlace, onClosePlace, routeOverrides, isAdmin, onMovePlace }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const routeRef = useRef(null);
  const dateStripRef = useRef(null);
  // Remembers which day/route the camera was last fitted to so selecting a
  // marker doesn't yank the view around.
  const fittedRouteRef = useRef("");
  const [routeListOpen, setRouteListOpen] = useState(true);

  const dayMeta = tripDays.find((item) => item.day === selectedDay);
  const routeStops = useMemo(
    () => dayMeta ? getRouteStopsForDay(dayMeta, activities, routeOverrides) : [],
    [activities, dayMeta, routeOverrides]
  );

  useEffect(() => {
    if (mapRef.current || !mapEl.current) return;
    const map = L.map(mapEl.current, { zoomControl: false }).setView([-8.55, 115.2], 10);
    mapRef.current = map;
    // OSM tile usage requires visible attribution — do not remove.
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};
    if (routeRef.current) routeRef.current.remove();

    const coords = routeStops.filter((stop) => stop.lat && stop.lng).map((stop) => [stop.lat, stop.lng]);
    if (coords.length > 1) {
      routeRef.current = L.polyline(coords, { color: dayColor, weight: 4, opacity: 0.9, dashArray: "2 10", lineCap: "round" }).addTo(map);
      const routeSignature = (dayMeta?.date || "") + ":" + coords.length;
      if (fittedRouteRef.current !== routeSignature) {
        fittedRouteRef.current = routeSignature;
        map.fitBounds(routeRef.current.getBounds(), { padding: [74, 74] });
      }
    }

    const markerStops = getUniqueMarkerStops(routeStops);
    const markerOffsets = getMarkerOffsets(markerStops, map);
    markerStops.forEach(({ stop, routeIndex, markerNumber }, markerIndex) => {
      if (!stop.lat || !stop.lng) return;
      const markerKind = getMarkerKind(stop);
      const markerKey = markerKeyFor(stop, markerIndex);
      const marker = L.marker([stop.lat, stop.lng], { icon: createMarkerIcon({ number: markerNumber || routeIndex, markerKind, active: selectedPlace?.id === stop.id, offset: markerOffsets[markerKey] }) }).addTo(map).on("click", () => onSelectPlace(stop));
      markersRef.current[markerKey] = marker;
    });
    window.setTimeout(() => map.invalidateSize(), 180);
  }, [routeStops, selectedPlace, onSelectPlace, dayMeta]);

  function zoomIn() {
    mapRef.current?.zoomIn();
  }

  function zoomOut() {
    mapRef.current?.zoomOut();
  }

  function locateMe() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((position) => {
      mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 14, { animate: true });
    });
  }

  function scrollDates(direction) {
    dateStripRef.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  }

  return (
    <main className="map-page">
      <div className="map-canvas" ref={mapEl} />
      <div className="map-date-shell">
        <button className="map-date-arrow" type="button" onClick={() => scrollDates(-1)} aria-label="Previous dates"><ChevronLeft size={20} /></button>
        <div className="day-strip map-date-strip" ref={dateStripRef} aria-label="Map date selector">{tripDays.map((day) => <button key={day.day} type="button" className={selectedDay === day.day ? "active" : ""} onClick={() => onSelectDay(day.day)}>{day.date}</button>)}</div>
        <button className="map-date-arrow" type="button" onClick={() => scrollDates(1)} aria-label="Next dates"><ChevronRight size={20} /></button>
      </div>
      <div className="map-top-pill"><p className="eyebrow accent">Day {selectedDay} · {dayMeta?.date} · {dayMeta?.area}</p><h1>{selectedPlace ? selectedPlace.title : dayMeta?.title || "Route Map"}</h1></div>
      <div className="map-control-stack" aria-label="Map controls">
        <button type="button" onClick={zoomIn} aria-label="Zoom in"><Plus size={22} /></button>
        <button type="button" onClick={zoomOut} aria-label="Zoom out"><Minus size={22} /></button>
        <button type="button" onClick={locateMe} aria-label="Locate me"><LocateFixed size={21} /></button>
      </div>
      <RouteListCard routeStops={routeStops} open={routeListOpen} onToggle={() => setRouteListOpen((current) => !current)} onSelectPlace={onSelectPlace} />
      {selectedPlace && <PlaceSheet place={selectedPlace} dayMeta={dayMeta} isAdmin={isAdmin} onMovePlace={onMovePlace} onClose={onClosePlace} />}
    </main>
  );
}

function RouteListCard({ routeStops, open, onToggle, onSelectPlace }) {
  let stopCount = 0;

  return (
    <section className={"map-route-list " + (open ? "open" : "collapsed")} aria-label="Day route list">
      <button className="map-route-list-toggle" type="button" onClick={onToggle} aria-label={open ? "Collapse route list" : "Open route list"}>
        <span>Route</span>
        {open ? <ArrowDown size={17} /> : <ArrowUp size={17} />}
      </button>
      {open && (
        <div className="map-route-list-scroll">
          {routeStops.map((place, index) => {
            const kind = getMarkerKind(place);
            const isStop = kind === "stop";
            if (isStop) stopCount += 1;
            return (
              <button key={`${place.id}-${index}`} className="map-route-item" type="button" onClick={() => onSelectPlace(place)}>
                <RouteListIcon kind={kind} number={stopCount} />
                <span>{place.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function RouteListIcon({ kind, number }) {
  if (kind === "airport") return <span className="route-list-symbol"><Plane size={14} /></span>;
  if (kind === "step") return <span className="route-list-empty" />;
  if (kind !== "stop") return <span className="route-list-symbol"><Home size={14} /></span>;
  return <span className="route-list-number">{number}</span>;
}

function PlaceSheet({ place, dayMeta, isAdmin, onMovePlace, onClose }) {
  const startY = useRef(null);
  const isStay = STAY_TYPES.includes(place.type);
  const markerKind = getMarkerKind(place);
  const isRouteStep = markerKind === "step";
  const editable = place.aiAdded || place.customAdded;
  function onTouchStart(event) { startY.current = event.touches[0].clientY; }
  function onTouchEnd(event) {
    if (startY.current === null) return;
    if (event.changedTouches[0].clientY - startY.current > 70) onClose();
    startY.current = null;
  }
  return (
    <section className="place-sheet" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="sheet-grabber" />
      <button className="sheet-close" type="button" aria-label="Close" onClick={onClose}><X size={19} /></button>
      <img src={place.photo} alt={place.title} />
      <div className="sheet-title-row">{isStay ? <span className="marker-circle">{markerKind === "airport" ? <Plane size={19} /> : <Home size={19} />}</span> : isRouteStep ? <span className="marker-circle route-step-icon"><Route size={19} /></span> : <span className="marker-circle number">{place.number}</span>}<div><p className="eyebrow accent">{isStay ? place.area : place.time}</p><h1>{place.title}</h1></div></div>
      {isAdmin && editable && (
        <div className="map-order-controls">
          <button type="button" onClick={() => onMovePlace(dayMeta, place.id, -1)}><ArrowUp size={17} /> Move up</button>
          <button type="button" onClick={() => onMovePlace(dayMeta, place.id, 1)}><ArrowDown size={17} /> Move down</button>
        </div>
      )}
      {!isStay && <div className="route-leg-card"><Info icon={<MapPinned size={20} />} label="From" value={place.travelFrom || "Previous stop"} /><Info icon={travelIcon(place)} label="Mode" value={travelMode(place)} /><Info icon={<Clock3 size={20} />} label="Estimated time" value={place.travelTime || "Check traffic"} /></div>}
      <p className="sheet-notes">{place.notes}</p>
      <div className="sheet-actions"><a className="secondary-action" href={place.mapsUrl} target="_blank" rel="noreferrer"><MapPinned size={18} /> Google Maps</a><a className="primary-action" href={directionsUrl(place)} target="_blank" rel="noreferrer"><Navigation size={18} /> Directions</a></div>
    </section>
  );
}

function Info({ icon, label, value }) {
  return <div className="sheet-info route-info">{icon}<small>{label}</small><strong>{value}</strong></div>;
}

function travelMode(place) {
  if (place.cars || place.type === "transport") return "Grab / private car";
  if (place.type === "tour") return place.travelTime?.toLowerCase().includes("included") ? "Tour transfer" : "Bike / Grab";
  return "Bike / Grab";
}

function travelIcon(place) {
  if (place.cars || place.type === "transport") return <Car size={20} />;
  if (place.type === "tour") return <Route size={20} />;
  return <Bike size={20} />;
}

function directionsUrl(place) {
  if (place.lat && place.lng) return "https://www.google.com/maps/dir/?api=1&destination=" + place.lat + "," + place.lng;
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(place.title);
}

function markerKeyFor(stop, index) {
  return `${stop.id}-${index}`;
}

function getUniqueMarkerStops(stops) {
  const seen = new Set();
  const uniqueStops = [];
  let markerNumber = 0;

  stops.forEach((stop, routeIndex) => {
    const kind = getMarkerKind(stop);
    if (kind === "step") return;
    if (kind === "stop") markerNumber += 1;
    const key = stop.id || `${stop.lat},${stop.lng}`;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueStops.push({ stop, routeIndex, markerNumber: kind === "stop" ? markerNumber : null });
  });

  return uniqueStops;
}

function getMarkerOffsets(markerStops, map) {
  const positioned = markerStops
    .map(({ stop }, index) => stop.lat && stop.lng ? { stop, index, key: markerKeyFor(stop, index), point: map.latLngToLayerPoint([stop.lat, stop.lng]) } : null)
    .filter(Boolean);
  const offsets = {};
  const used = new Set();

  positioned.forEach((item) => {
    if (used.has(item.key)) return;
    const cluster = positioned.filter((other) => {
      if (used.has(other.key)) return false;
      return item.point.distanceTo(other.point) <= 40;
    });
    cluster.forEach((member) => used.add(member.key));
    cluster.forEach((member, clusterIndex) => {
      offsets[member.key] = markerOffset(clusterIndex, cluster.length);
    });
  });

  return offsets;
}

function markerOffset(index, total) {
  if (total <= 1) return { x: 0, y: 0 };
  const radius = 22;
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius)
  };
}

function getMarkerKind(place) {
  if (place.type === "airport") return "airport";
  if (place.type === "airbnb" || place.type === "villa") return "stay";
  if (place.type === "port") return "port";
  if (place.type === "transport" || place.type === "lodging") return "step";
  return "stop";
}

function createMarkerIcon({ number, markerKind, active, offset = { x: 0, y: 0 } }) {
  const size = active ? 52 : 44;
  const homeSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10.5 9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-6h5v6"/></svg>';
  const planeSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5c1-1 1.4-2.6.5-3.5s-2.5-.5-3.5.5L13 8 4.8 6.2 3.5 7.5l6 3-3 3-3-.5-1 1 4 2 2 4 1-1-.5-3 3-3 3 6z"/></svg>';
  const isSymbol = markerKind !== "stop";
  const content = markerKind === "airport" ? planeSvg : isSymbol ? homeSvg : number;
  const activeShadow = active ? "0 14px 34px rgba(10,124,124,.36)" : "0 10px 24px rgba(17,17,17,.22)";

  return L.divIcon({
    className: "",
    html: '<div style="position:relative;width:' + size + 'px;height:' + (size + 8) + 'px;display:flex;align-items:flex-start;justify-content:center;transform:translate(' + offset.x + 'px,' + offset.y + 'px);"><div style="width:' + size + 'px;height:' + size + 'px;border-radius:' + Math.round(size * 0.38) + 'px ' + Math.round(size * 0.38) + 'px ' + Math.round(size * 0.38) + 'px 12px;background:' + dayColor + ';color:white;display:flex;align-items:center;justify-content:center;font-size:' + (isSymbol ? 0 : 17) + 'px;font-weight:900;border:3px solid white;box-shadow:' + activeShadow + ';transform:rotate(-45deg);"><span style="display:flex;align-items:center;justify-content:center;transform:rotate(45deg);line-height:1;">' + content + '</span></div><div style="position:absolute;bottom:0;width:18px;height:5px;border-radius:999px;background:rgba(0,0,0,.18);filter:blur(.4px);"></div></div>',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 4]
  });
}
