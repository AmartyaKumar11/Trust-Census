/**
 * Privacy Noise Module
 * 
 * RESPONSIBILITY: Differential privacy noise generation for macro-aggregation
 * 
 * STATUS: PLACEHOLDER - NOT IMPLEMENTED YET
 * 
 * This module will implement:
 * - Laplace noise generation
 * - Gaussian noise generation
 * - Privacy budget tracking
 * 
 * MUST:
 * - Generate cryptographically appropriate noise
 * - Use configured epsilon value
 * - Make noise irreversible
 * 
 * MUST NEVER:
 * - Allow noise removal
 * - Expose true values
 * - Use predictable random source
 */

import { MACRO_AGGREGATION_CONFIG } from '../config.js';

/**
 * Noise mechanism types
 */
export const NoiseMechanism = Object.freeze({
  LAPLACE: 'LAPLACE',
  GAUSSIAN: 'GAUSSIAN',
});

/**
 * Generate Laplace noise for differential privacy
 * 
 * The Laplace mechanism provides ε-differential privacy by adding noise
 * drawn from Laplace(0, Δf/ε) where:
 * - Δf is the sensitivity (max change from one record)
 * - ε is the privacy parameter (lower = more privacy)
 * 
 * @param {number} sensitivity - Query sensitivity
 * @param {number} epsilon - Privacy parameter
 * @returns {number} - Noise value
 */
export function generateLaplaceNoise(
  sensitivity = MACRO_AGGREGATION_CONFIG.SENSITIVITY,
  epsilon = MACRO_AGGREGATION_CONFIG.EPSILON
) {
  // Scale parameter b = sensitivity / epsilon
  const b = sensitivity / epsilon;

  // Generate uniform random in (-0.5, 0.5)
  const u = Math.random() - 0.5;

  // Inverse CDF of Laplace distribution
  // F^{-1}(p) = μ - b * sign(p - 0.5) * ln(1 - 2|p - 0.5|)
  // For μ = 0: noise = -b * sign(u) * ln(1 - 2|u|)
  const noise = -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

  return noise;
}

/**
 * Generate Gaussian noise for differential privacy
 * 
 * The Gaussian mechanism provides (ε, δ)-differential privacy by adding noise
 * drawn from N(0, σ²) where:
 * - σ = Δf * sqrt(2 * ln(1.25/δ)) / ε
 * 
 * @param {number} sensitivity - Query sensitivity
 * @param {number} epsilon - Privacy parameter
 * @param {number} delta - Failure probability (default: 1e-5)
 * @returns {number} - Noise value
 */
export function generateGaussianNoise(
  sensitivity = MACRO_AGGREGATION_CONFIG.SENSITIVITY,
  epsilon = MACRO_AGGREGATION_CONFIG.EPSILON,
  delta = 1e-5
) {
  // Standard deviation σ = Δf * sqrt(2 * ln(1.25/δ)) / ε
  const sigma = (sensitivity * Math.sqrt(2 * Math.log(1.25 / delta))) / epsilon;

  // Box-Muller transform for Gaussian random
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  return z * sigma;
}

/**
 * Apply differential privacy noise to a value
 * 
 * @param {number} trueValue - The true value to protect
 * @param {string} mechanism - Noise mechanism (LAPLACE or GAUSSIAN)
 * @returns {object} - { noisedValue, metadata }
 */
export function applyNoise(trueValue, mechanism = MACRO_AGGREGATION_CONFIG.NOISE_MECHANISM) {
  let noise;

  switch (mechanism) {
    case NoiseMechanism.LAPLACE:
      noise = generateLaplaceNoise();
      break;
    case NoiseMechanism.GAUSSIAN:
      noise = generateGaussianNoise();
      break;
    default:
      throw new Error(`Unknown noise mechanism: ${mechanism}`);
  }

  // Add noise and ensure non-negative (counts can't be negative)
  const noisedValue = Math.max(0, Math.round(trueValue + noise));

  return {
    noisedValue,
    metadata: {
      mechanism,
      epsilon: MACRO_AGGREGATION_CONFIG.EPSILON,
      sensitivity: MACRO_AGGREGATION_CONFIG.SENSITIVITY,
      noiseApplied: true,
      // NOTE: Do NOT include the actual noise value - that would compromise privacy
    },
  };
}

/**
 * Apply noise to multiple values (e.g., household count and population count)
 * Each value gets independent noise
 * 
 * @param {object} values - Object with numeric values to protect
 * @returns {object} - Object with noised values and metadata
 */
export function applyNoiseToAggregate(values) {
  const noisedValues = {};
  const metadata = {
    mechanism: MACRO_AGGREGATION_CONFIG.NOISE_MECHANISM,
    epsilon: MACRO_AGGREGATION_CONFIG.EPSILON,
    fieldsNoised: [],
  };

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'number') {
      const { noisedValue } = applyNoise(value);
      noisedValues[key] = noisedValue;
      metadata.fieldsNoised.push(key);
    } else {
      noisedValues[key] = value; // Pass through non-numeric values
    }
  }

  return {
    values: noisedValues,
    metadata,
  };
}

/**
 * Get noise configuration summary (non-sensitive)
 * 
 * @returns {object} - Noise configuration
 */
export function getNoiseSummary() {
  return {
    mechanism: MACRO_AGGREGATION_CONFIG.NOISE_MECHANISM,
    epsilon: MACRO_AGGREGATION_CONFIG.EPSILON,
    sensitivity: MACRO_AGGREGATION_CONFIG.SENSITIVITY,
  };
}

/**
 * Validate privacy parameters
 * 
 * @returns {boolean} - True if parameters are valid
 * @throws {Error} - If parameters are invalid
 */
export function validatePrivacyParameters() {
  const errors = [];

  if (MACRO_AGGREGATION_CONFIG.EPSILON <= 0) {
    errors.push('Epsilon must be positive');
  }

  if (MACRO_AGGREGATION_CONFIG.EPSILON > 1.0) {
    errors.push('Epsilon should be ≤ 1.0 for strong privacy (current: ' + MACRO_AGGREGATION_CONFIG.EPSILON + ')');
  }

  if (MACRO_AGGREGATION_CONFIG.SENSITIVITY <= 0) {
    errors.push('Sensitivity must be positive');
  }

  if (!Object.values(NoiseMechanism).includes(MACRO_AGGREGATION_CONFIG.NOISE_MECHANISM)) {
    errors.push('Invalid noise mechanism: ' + MACRO_AGGREGATION_CONFIG.NOISE_MECHANISM);
  }

  if (errors.length > 0) {
    throw new Error(`Privacy parameter validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

