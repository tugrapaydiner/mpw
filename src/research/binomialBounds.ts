export const BINOMIAL_BOUND_NUMERICAL_TOLERANCE = 1e-12;
export const MAX_BINOMIAL_BOUND_TRIALS = 10_000_000;

function validateProbability(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0 || value >= 1) {
    throw new Error(`${name} must be in (0,1)`);
  }
}

function validateCounts(successes: number, trials: number): void {
  if (
    !Number.isSafeInteger(trials) ||
    trials <= 0 ||
    trials > MAX_BINOMIAL_BOUND_TRIALS
  ) {
    throw new Error(
      `trials must be an integer in [1,${MAX_BINOMIAL_BOUND_TRIALS}]`
    );
  }
  if (
    !Number.isSafeInteger(successes) ||
    successes < 0 ||
    successes > trials
  ) {
    throw new Error("successes must be an integer in [0,trials]");
  }
}

// Lanczos approximation for log Gamma. Inputs used here are positive.
export function logGamma(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("logGamma input must be positive and finite");
  }
  const coefficients = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (value < 0.5) {
    return (
      Math.log(Math.PI) -
      Math.log(Math.sin(Math.PI * value)) -
      logGamma(1 - value)
    );
  }
  const shifted = value - 1;
  let series = coefficients[0];
  for (let index = 1; index < coefficients.length; index++) {
    series += coefficients[index] / (shifted + index);
  }
  const t = shifted + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) +
    (shifted + 0.5) * Math.log(t) -
    t +
    Math.log(series)
  );
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maximumIterations = 400;
  const epsilon = 3e-14;
  const minimum = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < minimum) d = minimum;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maximumIterations; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < minimum) d = minimum;
    c = 1 + aa / c;
    if (Math.abs(c) < minimum) c = minimum;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < minimum) d = minimum;
    c = 1 + aa / c;
    if (Math.abs(c) < minimum) c = minimum;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) <= epsilon) return h;
  }
  throw new Error("incomplete beta continued fraction did not converge");
}

/** Regularized incomplete beta I_x(a,b). */
export function regularizedIncompleteBeta(
  x: number,
  a: number,
  b: number
): number {
  if (!Number.isFinite(x) || x < 0 || x > 1) {
    throw new Error("x must be in [0,1]");
  }
  if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(b) || b <= 0) {
    throw new Error("a and b must be positive and finite");
  }
  if (x === 0) return 0;
  if (x === 1) return 1;
  const logFront =
    logGamma(a + b) -
    logGamma(a) -
    logGamma(b) +
    a * Math.log(x) +
    b * Math.log1p(-x);
  const front = Math.exp(logFront);
  const result =
    x < (a + 1) / (a + b + 2)
      ? (front * betaContinuedFraction(a, b, x)) / a
      : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
  return Math.max(0, Math.min(1, result));
}

/**
 * Exact binomial upper tail P[X >= successes] for X~Binomial(trials,p),
 * evaluated as I_p(successes, trials-successes+1).
 */
export function binomialUpperTail(
  successes: number,
  trials: number,
  probability: number
): number {
  validateCounts(successes, trials);
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("probability must be in [0,1]");
  }
  if (successes === 0) return 1;
  if (probability === 0) return 0;
  if (probability === 1) return 1;
  return regularizedIncompleteBeta(
    probability,
    successes,
    trials - successes + 1
  );
}

/**
 * One-sided Clopper-Pearson lower confidence bound. For observed x>0,
 * returns the p satisfying P_p[X>=x]=alpha. For x=0 the bound is zero.
 */
export function clopperPearsonLowerBound(
  successes: number,
  trials: number,
  alpha: number
): number {
  validateCounts(successes, trials);
  validateProbability(alpha, "alpha");
  if (successes === 0) return 0;
  if (successes === trials) return Math.pow(alpha, 1 / trials);

  let low = 0;
  let high = successes / trials;
  for (let iteration = 0; iteration < 160; iteration++) {
    const midpoint = (low + high) / 2;
    const tail = binomialUpperTail(successes, trials, midpoint);
    if (tail < alpha) low = midpoint;
    else high = midpoint;
    if (high - low <= BINOMIAL_BOUND_NUMERICAL_TOLERANCE) break;
  }
  return (low + high) / 2;
}

export function bonferroniClopperPearsonLowerBound(
  successes: number,
  trials: number,
  alpha: number,
  familySize: number
): number {
  validateProbability(alpha, "alpha");
  if (!Number.isSafeInteger(familySize) || familySize <= 0) {
    throw new Error("familySize must be a positive safe integer");
  }
  const perConfigurationAlpha = alpha / familySize;
  if (perConfigurationAlpha === 0) {
    throw new Error("alpha/familySize underflowed to zero");
  }
  return clopperPearsonLowerBound(
    successes,
    trials,
    perConfigurationAlpha
  );
}
