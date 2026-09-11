import { exchange } from "../data/tripData";

export function formatMoney(valueTHB = 0, currency = "THB") {
  const safeValue = Number(valueTHB) || 0;

  if (currency === "IDR") {
    const valueIDR = Math.round(safeValue / exchange.idrToThb);
    return `Rp ${new Intl.NumberFormat("id-ID").format(valueIDR)}`;
  }

  if (currency === "USD") {
    const valueUSD = safeValue / exchange.usdToThb;
    return `$${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valueUSD)}`;
  }

  return `฿${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.round(safeValue))}`;
}

export function moneyToTHB(value = 0, currency = "THB") {
  const amount = Number(value) || 0;
  if (currency === "IDR") return Math.round(amount * exchange.idrToThb);
  if (currency === "USD") return Math.round(amount * exchange.usdToThb);
  return Math.round(amount);
}

export function formatUsd(valueUSD = 0) {
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(valueUSD) || 0)}`;
}
