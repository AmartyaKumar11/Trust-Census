#!/usr/bin/env python3
"""
National Policy Analytics Data Pipeline
Trust Census System - Privacy-First Policy Analytics

RESPONSIBILITY: Convert CSV policy data into deployable JSON asset

MUST:
- Read /data/india_state_policy_analytics.csv
- Validate required columns
- Convert to JSON with categorical data only
- Include state code mapping for database integration
- Enforce privacy constraints (no raw numbers in UI data)
- Generate static asset for frontend consumption

MUST NEVER:
- Include district-level data
- Expose raw percentages in UI data
- Include individual-level inference capability
- Allow dynamic aggregation from UI
"""

import csv
import json
import os
import sys
from pathlib import Path

# Required columns for validation
REQUIRED_COLUMNS = [
    'state_code', 'state_name', 'urban_category', 'density_category', 
    'sex_ratio', 'urban_data_available'
]

# Official State Code Mapping (Census of India standard)
# Maps CSV numeric codes to database alphabetic codes
STATE_CODE_MAPPING = {
    '01': 'JK',  # Jammu & Kashmir
    '02': 'HP',  # Himachal Pradesh  
    '03': 'PB',  # Punjab
    '04': 'CH',  # Chandigarh
    '05': 'UT',  # Uttarakhand
    '06': 'HR',  # Haryana
    '07': 'DL',  # NCT of Delhi
    '08': 'RJ',  # Rajasthan
    '09': 'UP',  # Uttar Pradesh
    '10': 'BR',  # Bihar
    '11': 'SK',  # Sikkim
    '12': 'AR',  # Arunachal Pradesh
    '13': 'NL',  # Nagaland
    '14': 'MN',  # Manipur
    '15': 'MZ',  # Mizoram
    '16': 'TR',  # Tripura
    '17': 'ML',  # Meghalaya
    '18': 'AS',  # Assam
    '19': 'WB',  # West Bengal
    '20': 'JH',  # Jharkhand
    '21': 'OD',  # Odisha
    '22': 'CG',  # Chhattisgarh
    '23': 'MP',  # Madhya Pradesh
    '24': 'GJ',  # Gujarat
    '25': 'DD',  # Daman & Diu
    '26': 'DN',  # Dadra & Nagar Haveli
    '27': 'MH',  # Maharashtra
    '28': 'AP',  # Andhra Pradesh
    '29': 'KA',  # Karnataka
    '30': 'GA',  # Goa
    '31': 'LD',  # Lakshadweep
    '32': 'KL',  # Kerala
    '33': 'TN',  # Tamil Nadu
    '34': 'PY',  # Puducherry
    '35': 'AN'   # Andaman & Nicobar Islands
}

def validate_csv_structure(csv_path):
    """Validate that CSV has required columns"""
    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            headers = reader.fieldnames
            
            missing_columns = [col for col in REQUIRED_COLUMNS if col not in headers]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
                
            print(f"✓ CSV validation passed. Found {len(headers)} columns.")
            return True
            
    except FileNotFoundError:
        raise FileNotFoundError(f"CSV file not found: {csv_path}")
    except Exception as e:
        raise Exception(f"CSV validation failed: {str(e)}")

def interpret_sex_ratio(sex_ratio):
    """Convert sex ratio to policy interpretation (no raw numbers in UI)"""
    try:
        ratio = int(sex_ratio)
        if ratio >= 1000:
            return "Above national average"
        elif ratio >= 950:
            return "Near national average" 
        elif ratio >= 900:
            return "Below national average"
        else:
            return "Significantly below average"
    except (ValueError, TypeError):
        return "Data unavailable"

def get_policy_interpretation(urban_category, density_category):
    """Generate policy interpretation text based on categories"""
    interpretations = {
        ("Highly Urbanized", "Very High Density"): "Metropolitan focus: Infrastructure capacity, urban services, and sustainable development priorities.",
        ("Highly Urbanized", "High Density"): "Urban center: Service delivery optimization and infrastructure development focus.",
        ("Moderately Urbanized", "High Density"): "Emerging urban: Balanced urban-rural development with infrastructure scaling needs.",
        ("Moderately Urbanized", "Medium Density"): "Transitional region: Mixed development approach with urban growth management.",
        ("Semi-Rural", "High Density"): "Dense rural: Rural infrastructure with connectivity and service access priorities.",
        ("Semi-Rural", "Medium Density"): "Rural development: Infrastructure connectivity and service delivery focus.",
        ("Semi-Rural", "Low Density"): "Rural connectivity: Infrastructure access and service delivery challenges.",
        ("Predominantly Rural", "Low Density"): "Rural priority: Connectivity, infrastructure access, and service delivery focus.",
        ("Predominantly Rural", "Medium Density"): "Rural development: Infrastructure and connectivity improvement needs.",
        ("Insufficient Data", "Low Density"): "Data collection priority: Governance capacity building and data infrastructure needs."
    }
    
    key = (urban_category, density_category)
    return interpretations.get(key, "Mixed development approach with infrastructure and service priorities.")

def convert_csv_to_policy_json(csv_path, output_path):
    """Convert CSV to policy-grade JSON with categorical data only"""
    
    # Validate CSV structure
    validate_csv_structure(csv_path)
    
    # Initialize JSON structure
    policy_data = {
        "metadata": {
            "source": "Census of India 2011",
            "policy_scope": "National",
            "data_type": "Policy-grade categorical analytics",
            "generated_at": "2024-01-01T00:00:00Z",
            "privacy_notes": [
                "No individual-level inference",
                "No district-level data", 
                "No exact percentages",
                "Categorical interpretations only"
            ],
            "governance_notes": [
                "State-level policy analytics only",
                "Derived from Census 2011 official data",
                "Privacy-first design principles"
            ],
            "state_code_formats": {
                "csv_format": "2-digit numeric codes (01, 02, 03, ..., 35)",
                "database_format": "2-character alphabetic codes (JK, HP, PB, ..., AN)",
                "mapping_included": "Both formats provided for system integration"
            }
        },
        "state_code_mapping": {
            "numeric_to_alpha": STATE_CODE_MAPPING,
            "alpha_to_numeric": {v: k for k, v in STATE_CODE_MAPPING.items()},
            "description": "Mapping between CSV numeric codes and database alphabetic codes"
        },
        "states": {}
    }
    
    # Track statistics for national summary
    urban_categories = {}
    density_categories = {}
    data_gaps = []
    
    # Process CSV data
    with open(csv_path, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            state_code = row['state_code'].zfill(2)  # Ensure 2-digit format
            state_name = row['state_name'].strip()
            urban_category = row['urban_category'].strip()
            density_category = row['density_category'].strip()
            sex_ratio = row['sex_ratio']
            urban_data_available = row['urban_data_available'].lower() == 'true'
            
            # Get corresponding database code
            database_code = STATE_CODE_MAPPING.get(state_code, 'UNKNOWN')
            
            # Track for national patterns
            urban_categories[urban_category] = urban_categories.get(urban_category, 0) + 1
            density_categories[density_category] = density_categories.get(density_category, 0) + 1
            
            if not urban_data_available:
                data_gaps.append(state_name)
            
            # Create state entry with categorical data only
            policy_data["states"][state_code] = {
                "state_name": state_name,
                "csv_code": state_code,
                "database_code": database_code,
                "urban_category": urban_category,
                "density_category": density_category,
                "sex_ratio_interpretation": interpret_sex_ratio(sex_ratio),
                "policy_interpretation": get_policy_interpretation(urban_category, density_category),
                "urban_data_available": urban_data_available
            }
    
    # Add national patterns summary (categorical only)
    policy_data["national_patterns"] = {
        "predominant_urban_category": max(urban_categories.items(), key=lambda x: x[1])[0],
        "predominant_density_category": max(density_categories.items(), key=lambda x: x[1])[0],
        "data_gaps_count": len(data_gaps),
        "data_gaps_states": data_gaps,
        "summary_insights": [
            f"Most states are categorized as {max(urban_categories.items(), key=lambda x: x[1])[0].lower()}",
            f"Population density is predominantly {max(density_categories.items(), key=lambda x: x[1])[0].lower()}",
            f"Data collection gaps exist in {len(data_gaps)} states" if data_gaps else "Complete data coverage achieved"
        ]
    }
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Write JSON file
    with open(output_path, 'w', encoding='utf-8') as file:
        json.dump(policy_data, file, indent=2, ensure_ascii=False)
    
    print(f"✓ Policy JSON generated: {output_path}")
    print(f"✓ Processed {len(policy_data['states'])} states")
    print(f"✓ Data gaps identified: {len(data_gaps)} states")
    print(f"✓ State code mapping included for database integration")
    
    return policy_data

def main():
    """Main execution function"""
    
    # Define paths relative to repository root
    repo_root = Path(__file__).parent.parent
    csv_path = repo_root / "data" / "india_state_policy_analytics.csv"
    output_path = repo_root / "frontend" / "public" / "data" / "india_state_policy_analytics.json"
    
    print("=" * 70)
    print("Trust Census - National Policy Analytics Data Pipeline")
    print("=" * 70)
    print(f"Input CSV: {csv_path}")
    print(f"Output JSON: {output_path}")
    print()
    
    try:
        # Convert CSV to policy JSON
        policy_data = convert_csv_to_policy_json(csv_path, output_path)
        
        print()
        print("=" * 70)
        print("✅ Policy JSON Generation Complete")
        print("=" * 70)
        print("Privacy constraints enforced:")
        print("  ✓ No raw percentages in output")
        print("  ✓ No district-level data")
        print("  ✓ Categorical interpretations only")
        print("  ✓ Policy-grade analytics ready")
        print()
        print("State code mapping included:")
        print("  ✓ CSV numeric codes (01, 02, 03, ..., 35)")
        print("  ✓ Database alphabetic codes (JK, HP, PB, ..., AN)")
        print("  ✓ Bidirectional mapping for system integration")
        print()
        
        return 0
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())