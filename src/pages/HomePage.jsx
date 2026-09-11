import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Clock3, Home, Navigation, Trash2, Users, Wallet } from "lucide-react";
import { TRIP_NAME, airbnbs, groupSize, routeByDay, tripDateLabel, tripDays } from "../data/tripData";
import { formatMoney, formatUsd } from "../utils/currency";
import { getDayEstimate, getPerPersonCost, getTotalEstimate } from "../utils/budget";
import { getOrderedActivitiesForDay } from "../utils/routes";
import CurrencySwitch from "../components/CurrencySwitch";

export default function HomePage({ activities, currency, setCurrency, onOpenPlace, onDeletePlace, isAdmin, routeOverrides, onMovePlace, selectedDay: appSelectedDay = 1, onSelectDay }) {
  const [expandedId, setExpandedId] = useState(null);
  const [selectedDay, setSelectedDay] = useState(appSelectedDay);
  const total = getTotalEstimate(activities);
  const day = tripDays.find((item) => item.day === selectedDay) || tripDays[0];
  const dayActivities = useMemo(
    () => getOrderedActivitiesForDay(day, activities, routeOverrides),
    [activities, day, routeOverrides]
  );
  const startPlace = getStartPlace(day);
  const endPlace = getEndPlace(day);

  useEffect(() => {
    setSelectedDay(appSelectedDay);
    setExpandedId(null);
  }, [appSelectedDay]);

  function selectDay(nextDay) {
    setSelectedDay(nextDay);
    setExpandedId(null);
    onSelectDay?.(nextDay);
  }

  return (
    <main className="page page-scroll">
      <header className="page-header">
        <p className="eyebrow">{tripDateLabel} · {groupSize} travelers</p>
        <h1>{TRIP_NAME}</h1>
      </header>

      <section className="card total-card hero-total">
        <div>
          <p className="eyebrow">Per-person estimate</p>
          <strong>{formatMoney(total, currency)}</strong>
        </div>
        <CurrencySwitch currency={currency} setCurrency={setCurrency} />
      </section>

      <DayPicker selectedDay={selectedDay} onSelectDay={selectDay} />

      <section className="card route-card">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow accent">Day {day.day} · {day.date} · {day.area}</p>
            <div className="day-title-line">
              <h2>{day.title}</h2>
              <span className="day-total">{formatMoney(getDayEstimate(activities, day.day), currency)}</span>
            </div>
          </div>
        </div>

        {startPlace && <RouteAnchor place={startPlace} label="Start" />}

        {dayActivities.map((item) => (
          <RouteStop
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onOpenPlace={(place) => onOpenPlace(place, item.day)}
            onDeletePlace={onDeletePlace}
            currency={currency}
            isAdmin={isAdmin}
            dayMeta={day}
            onMovePlace={onMovePlace}
          />
        ))}

        {endPlace && endPlace.id !== startPlace?.id && <RouteAnchor place={endPlace} label="End" muted />}
      </section>
    </main>
  );
}

function DayPicker({ selectedDay, onSelectDay }) {
  return (
    <section className="date-picker card" aria-label="Choose itinerary date">
      {tripDays.map((day) => (
        <button key={day.day} type="button" className={selectedDay === day.day ? "active" : ""} onClick={() => onSelectDay(day.day)}>
          <span>Day {day.day}</span>
          <strong>{day.date}</strong>
        </button>
      ))}
    </section>
  );
}

function getStartPlace(day) {
  const firstId = routeByDay[day.day]?.[0] || day.stayId;
  return airbnbs.find((item) => item.id === firstId) || airbnbs.find((item) => item.id === day.stayId);
}

function getEndPlace(day) {
  const route = routeByDay[day.day] || [];
  const lastId = route[route.length - 1];
  return airbnbs.find((item) => item.id === lastId);
}

function RouteAnchor({ place, label, muted = false }) {
  return <div className="route-anchor static"><span className={"marker-circle " + (muted ? "muted" : "")}><Home size={20} /></span><span><strong>{place.title}</strong><small>{label}</small></span></div>;
}

function RouteStop({ item, expanded, onToggle, onOpenPlace, onDeletePlace, currency, isAdmin, dayMeta, onMovePlace }) {
  const editable = item.aiAdded || item.customAdded;

  return (
    <article className="route-stop">
      <div className="travel-line"><span>{item.travelTime}</span></div>
      <div className={"stop-summary-row " + (expanded ? "expanded" : "")}>
        <button type="button" className="stop-summary" onClick={onToggle}>
          <span className="marker-circle number">{item.number}</span>
          <span>{item.aiAdded && <small className="ai-chip">AI added</small>}{item.customAdded && <small className="ai-chip">Custom</small>}<strong>{item.title}</strong><small>{item.time} · {item.area}</small></span>
        </button>
        {isAdmin && editable && (
          <div className="order-controls" aria-label={`Move ${item.title}`}>
            <button type="button" onClick={() => onMovePlace(dayMeta, item.id, -1)} aria-label="Move up"><ArrowUp size={16} /></button>
            <button type="button" onClick={() => onMovePlace(dayMeta, item.id, 1)} aria-label="Move down"><ArrowDown size={16} /></button>
          </div>
        )}
        {item.deletable && (
          <button type="button" className="timeline-delete-button" onClick={() => onDeletePlace(item.id)} aria-label={`Delete ${item.title}`}>
            <Trash2 size={17} />
          </button>
        )}
      </div>
      {expanded && <div className="stop-detail"><img src={item.photo} alt={item.title} /><div className="stop-detail-body"><Info icon={<Clock3 size={17} />} label="Travel" value={item.travelTime} /><Info icon={<Navigation size={17} />} label="From" value={item.travelFrom} /><Info icon={<Wallet size={17} />} label="Per person" value={formatMoney(getDisplayCost(item), currency)} />{item.costPerPersonUSD && <Info icon={<Users size={17} />} label="Booked tour" value={`${formatUsd(item.costPerPersonUSD)} per pax`} />}{item.cars && <Info icon={<Users size={17} />} label="Transport" value={`${item.cars} cars · split per person`} />}<p>{item.notes}</p><button className="route-action" type="button" onClick={() => onOpenPlace(item)}><Navigation size={18} /> View route</button>{item.deletable && <button className="quiet-danger" type="button" onClick={() => onDeletePlace(item.id)}><Trash2 size={18} /> Delete custom place</button>}</div></div>}
    </article>
  );
}

function getDisplayCost(item) {
  return getPerPersonCost(item);
}

function Info({ icon, label, value }) {
  return <div className="info-row">{icon}<span><small>{label}</small><strong>{value}</strong></span></div>;
}
