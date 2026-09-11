/**
 * Configurable Scoring Policy & Business Rules
 *
 * Centralizes all thresholds, importance weights, and verification criteria
 * to eliminate buried magic numbers across controllers and services.
 */

export interface PriorityThresholds {
  /** Gap percentage threshold at or above which an action is flagged as High priority */
  highGapThreshold: number;
  /** Gap percentage threshold at or above which an action is flagged as Medium priority */
  mediumGapThreshold: number;
}

export interface CompatibilityPolicy {
  /** Importance weights used in weighted fulfillment ratio calculation */
  importanceWeights: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** Cutoffs for recruiter/candidate eligibility classifications */
  eligibilityThresholds: {
    eligible: number;
    needsBridge: number;
  };
}

export interface VerificationPolicy {
  /** Minimum proctoring integrity score required to accept assessment evidence */
  minimumProctoringIntegrity: number;
  /**
   * Explicit security rule: Score alone (e.g. >= 60%) NEVER automatically verifies a skill.
   * Legitimate evidence (proctored assessment audit, verified certificate, faculty endorsement) is mandatory.
   */
  allowScoreOnlyAutoVerification: boolean;
}

export const SCORING_POLICY = {
  // Priority determination when explicit requirement importance metadata is not provided
  priorityThresholds: {
    highGapThreshold: 25,
    mediumGapThreshold: 10,
  } as PriorityThresholds,

  // Compatibility score weights and cutoffs
  compatibility: {
    importanceWeights: {
      critical: 2.0,
      high: 1.5,
      medium: 1.0,
      low: 0.5,
    },
    eligibilityThresholds: {
      eligible: 75,
      needsBridge: 50,
    },
  } as CompatibilityPolicy,

  // Evidence verification rules
  verification: {
    minimumProctoringIntegrity: 70,
    allowScoreOnlyAutoVerification: false,
  } as VerificationPolicy,
};

/**
 * Derives action priority from explicit requirement metadata or gap magnitude using the central policy.
 */
export const calculatePriority = (
  gapPercentage: number | null,
  importance?: 'critical' | 'high' | 'medium' | 'low'
): 'High' | 'Medium' | 'Low' | null => {
  if (importance) {
    if (importance === 'critical' || importance === 'high') return 'High';
    if (importance === 'medium') return 'Medium';
    if (importance === 'low') return 'Low';
  }

  if (gapPercentage === null || gapPercentage === undefined) {
    return null;
  }

  if (gapPercentage >= SCORING_POLICY.priorityThresholds.highGapThreshold) {
    return 'High';
  }
  if (gapPercentage >= SCORING_POLICY.priorityThresholds.mediumGapThreshold) {
    return 'Medium';
  }
  return 'Low';
};
