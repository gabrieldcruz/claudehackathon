const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;
const LBS_PER_KG = 2.2046226218;

export const HEIGHT_LIMITS_CM = {
  min: 120,
  max: 230,
} as const;

export const WEIGHT_LIMITS_KG = {
  min: 35,
  max: 260,
} as const;

export interface ImperialBodyMetricsInput {
  heightFeet: number | string;
  heightInches?: number | string;
  weightLbs: number | string;
}

export function cmToFeetAndInches(heightCm: number) {
  const totalInches = heightCm / CM_PER_INCH;
  let feet = Math.floor(totalInches / INCHES_PER_FOOT);
  let inches = Number((totalInches - feet * INCHES_PER_FOOT).toFixed(1));

  if (inches >= INCHES_PER_FOOT) {
    feet += 1;
    inches = 0;
  }

  return { feet, inches };
}

export function feetAndInchesToCm(feet: number, inches: number) {
  return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

export function kgToLbs(weightKg: number) {
  return Number((weightKg * LBS_PER_KG).toFixed(1));
}

export function lbsToKg(weightLbs: number) {
  return weightLbs / LBS_PER_KG;
}

export function isValidHeightCm(heightCm: number) {
  return (
    Number.isFinite(heightCm) &&
    heightCm >= HEIGHT_LIMITS_CM.min &&
    heightCm <= HEIGHT_LIMITS_CM.max
  );
}

export function isValidWeightKg(weightKg: number) {
  return (
    Number.isFinite(weightKg) &&
    weightKg >= WEIGHT_LIMITS_KG.min &&
    weightKg <= WEIGHT_LIMITS_KG.max
  );
}

export function formatImperialInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function getImperialBodyMetricsForm(
  heightCm: number | null,
  weightKg: number | null
) {
  const height =
    typeof heightCm === "number" ? cmToFeetAndInches(heightCm) : null;

  return {
    heightFeet: height ? String(height.feet) : "",
    heightInches: height ? formatImperialInput(height.inches) : "",
    weightLbs:
      typeof weightKg === "number" ? formatImperialInput(kgToLbs(weightKg)) : "",
  };
}

export function parseImperialBodyMetrics(input: ImperialBodyMetricsInput) {
  const heightFeet = Number(input.heightFeet);
  const heightInches = Number(input.heightInches ?? 0);
  const weightLbs = Number(input.weightLbs);

  if (
    !Number.isFinite(heightFeet) ||
    !Number.isFinite(heightInches) ||
    !Number.isFinite(weightLbs) ||
    heightFeet < 0 ||
    heightInches < 0 ||
    heightInches >= INCHES_PER_FOOT
  ) {
    return null;
  }

  const heightCm = Number(feetAndInchesToCm(heightFeet, heightInches).toFixed(1));
  const weightKg = Number(lbsToKg(weightLbs).toFixed(1));

  if (!isValidHeightCm(heightCm) || !isValidWeightKg(weightKg)) {
    return null;
  }

  return { heightCm, weightKg };
}
