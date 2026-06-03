export const LOCATIONS = [
  "Visakhapatnam",
  "Vijayawada",
  "Rajamundry/Rajamahendravaram",
  "Ananthapuramu",
  "Amaravati"
] as const;

export type LocationType = typeof LOCATIONS[number];

export const LOCATION_DOMAINS: Record<LocationType, string[]> = {
  "Visakhapatnam": ["Medtech", "Fintech", "Biotech", "Blue economy", "Smart Infra"],
  "Vijayawada": ["Industrial IoT", "Agri Technology", "Auto-Body Building/Light Engineering", "Construction Technology"],
  "Rajamundry/Rajamahendravaram": ["Food Processing", "Marine Tech", "Aquaculture", "Energy Transition"],
  "Ananthapuramu": ["Automotive & EV sys", "Hybrid RE", "Agri & Food Processing", "Logistics-Warehousing", "Defence & Aerospace"],
  "Amaravati": ["Climate Tech", "Blockchain", "AVGC & XR", "Health Care", "Urban Systems", "Supply Chain"]
};

export const ALL_DOMAINS = Array.from(new Set(Object.values(LOCATION_DOMAINS).flat())).sort();
