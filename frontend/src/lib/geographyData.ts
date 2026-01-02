/**
 * Static Geography Data for Census Submission
 * 
 * RESPONSIBILITY: Provide human-readable geography selections
 * while preserving canonical codes internally.
 * 
 * MUST:
 * - Map human-readable names to canonical codes
 * - Support cascading selection (State → District → Block)
 * - Be static (no API calls)
 * - Be scope-bound and demo-sized
 * 
 * MUST NEVER:
 * - Be fetched from an API
 * - Include geography beyond MVP scope
 * - Send human-readable names to backend
 * - Expand without explicit authorization
 * 
 * NOTE: This is MVP data. In production, this would be
 * replaced with scope-bound data from the backend.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Block {
  /** Human-readable block name */
  name: string;
  /** Canonical 6-digit block code */
  code: string;
}

export interface District {
  /** Human-readable district name */
  name: string;
  /** Canonical 4-digit district code */
  code: string;
  /** Blocks within this district */
  blocks: Block[];
}

export interface State {
  /** Human-readable state name */
  name: string;
  /** Canonical 2-letter state code */
  code: string;
  /** Districts within this state (empty for states without data) */
  districts: District[];
}

// =============================================================================
// GEOGRAPHY DATA (MVP - DO NOT EXPAND WITHOUT AUTHORIZATION)
// =============================================================================

export const GEOGRAPHY_DATA: readonly State[] = Object.freeze([
  {
    name: 'Maharashtra',
    code: 'MH',
    districts: [
      {
        name: 'Pune',
        code: '0101',
        blocks: [
          { name: 'Haveli', code: '010101' },
          { name: 'Mulshi', code: '010102' },
          { name: 'Shirur', code: '010103' },
        ],
      },
      {
        name: 'Mumbai Suburban',
        code: '0102',
        blocks: [
          { name: 'Andheri', code: '010201' },
          { name: 'Borivali', code: '010202' },
          { name: 'Kurla', code: '010203' },
        ],
      },
      {
        name: 'Nagpur',
        code: '0103',
        blocks: [
          { name: 'Nagpur Urban', code: '010301' },
          { name: 'Nagpur Rural', code: '010302' },
        ],
      },
    ],
  },
  {
    name: 'Karnataka',
    code: 'KA',
    districts: [], // No districts for MVP
  },
  {
    name: 'Uttar Pradesh',
    code: 'UP',
    districts: [], // No districts for MVP
  },
  {
    name: 'Delhi',
    code: 'DL',
    districts: [], // No districts for MVP
  },
]);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all states as select options.
 */
export function getStateOptions(): { value: string; label: string }[] {
  return GEOGRAPHY_DATA.map(state => ({
    value: state.code,
    label: state.name,
  }));
}

/**
 * Get districts for a given state code.
 * Returns empty array if state not found or has no districts.
 */
export function getDistrictsForState(stateCode: string): District[] {
  const state = GEOGRAPHY_DATA.find(s => s.code === stateCode);
  return state?.districts ?? [];
}

/**
 * Get district options for a given state code.
 */
export function getDistrictOptions(stateCode: string): { value: string; label: string }[] {
  return getDistrictsForState(stateCode).map(district => ({
    value: district.code,
    label: district.name,
  }));
}

/**
 * Get blocks for a given state and district code.
 * Returns empty array if not found.
 */
export function getBlocksForDistrict(stateCode: string, districtCode: string): Block[] {
  const districts = getDistrictsForState(stateCode);
  const district = districts.find(d => d.code === districtCode);
  return district?.blocks ?? [];
}

/**
 * Get block options for a given state and district code.
 */
export function getBlockOptions(stateCode: string, districtCode: string): { value: string; label: string }[] {
  return getBlocksForDistrict(stateCode, districtCode).map(block => ({
    value: block.code,
    label: block.name,
  }));
}

/**
 * Get human-readable name for a state code.
 */
export function getStateName(stateCode: string): string | null {
  const state = GEOGRAPHY_DATA.find(s => s.code === stateCode);
  return state?.name ?? null;
}

/**
 * Get human-readable name for a district code.
 */
export function getDistrictName(stateCode: string, districtCode: string): string | null {
  const district = getDistrictsForState(stateCode).find(d => d.code === districtCode);
  return district?.name ?? null;
}

/**
 * Get human-readable name for a block code.
 */
export function getBlockName(stateCode: string, districtCode: string, blockCode: string): string | null {
  const block = getBlocksForDistrict(stateCode, districtCode).find(b => b.code === blockCode);
  return block?.name ?? null;
}

/**
 * Check if a state has district data available.
 */
export function stateHasDistricts(stateCode: string): boolean {
  return getDistrictsForState(stateCode).length > 0;
}

/**
 * Check if a district has block data available.
 */
export function districtHasBlocks(stateCode: string, districtCode: string): boolean {
  return getBlocksForDistrict(stateCode, districtCode).length > 0;
}

