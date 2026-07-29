import { useEffect, useState } from "react";
import { useSettings } from "@/lib/currency";

export interface DeliveryCity {
  city: string;
  fee: number;
}

export interface DeliveryConfig {
  enabled: boolean;
  pickupEnabled: boolean;
  defaultFee: number;
  delay: string;
  cities: DeliveryCity[];
}

const CITY_STORAGE_KEY = "conetec-delivery-city";

export function readDeliveryConfig(settings: unknown): DeliveryConfig {
  const extras = ((settings as Record<string, any> | undefined)?.extras ?? {}) as Record<string, any>;
  const defaultFee = Number(extras.delivery_fee ?? 0) || 0;
  const list: string[] = Array.isArray(extras.delivery_cities) ? extras.delivery_cities : [];
  const fees = (extras.delivery_city_fees ?? {}) as Record<string, unknown>;
  return {
    enabled: extras.delivery_enabled !== false,
    pickupEnabled: extras.pickup_enabled !== false,
    defaultFee,
    delay: String(extras.delivery_delay ?? "24-48h"),
    cities: list.map((city) => ({
      city,
      fee: fees[city] === undefined || fees[city] === null || fees[city] === "" ? defaultFee : Number(fees[city]) || 0,
    })),
  };
}

export function useDeliveryConfig(): DeliveryConfig {
  const { data } = useSettings();
  return readDeliveryConfig(data);
}

/** Villes proposées par défaut dans les paramètres de livraison. */
export const RDC_CITIES = [
  "Kinshasa", "Lubumbashi", "Goma", "Bukavu", "Kisangani", "Matadi",
  "Mbuji-Mayi", "Kananga", "Kolwezi", "Likasi", "Bunia", "Uvira",
  "Boma", "Kikwit", "Tshikapa", "Mbandaka",
];

/**
 * Résumé court des zones desservies : « Toute la RDC » quand toutes les villes
 * de la liste sont actives, sinon la liste des villes activées.
 */
export function deliveryAreaLabel(config: DeliveryConfig): string | null {
  if (!config.enabled || config.cities.length === 0) return null;
  const names = config.cities.map((c) => c.city);
  const coversAll = RDC_CITIES.every((c) => names.includes(c));
  if (coversAll) return "Toute la RDC";
  return names.join(", ");
}

export function feeForCity(config: DeliveryConfig, city: string | null): number {
  if (!city) return config.defaultFee;
  return config.cities.find((c) => c.city === city)?.fee ?? config.defaultFee;
}

/** Ville de livraison choisie, partagée entre le panier et le checkout. */
export function useSelectedCity() {
  const [city, setCityState] = useState<string | null>(null);

  useEffect(() => {
    try {
      setCityState(localStorage.getItem(CITY_STORAGE_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const setCity = (value: string | null) => {
    setCityState(value);
    try {
      if (value) localStorage.setItem(CITY_STORAGE_KEY, value);
      else localStorage.removeItem(CITY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return { city, setCity };
}
