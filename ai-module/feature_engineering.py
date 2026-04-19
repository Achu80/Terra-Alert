import pandas as pd
import numpy as np

def engineer_features(df):
    """
    Add derived features to improve landslide prediction.
    
    Input: DataFrame with base features
    Output: DataFrame with engineered features added
    """
    df = df.copy()
    
    # === RAINFALL RATIOS ===
    # Prevent division by zero
    df['rainfall_ratio_3d_7d'] = np.where(
        df['rainfall_7d'] > 0,
        df['rainfall_3d'] / df['rainfall_7d'],
        0
    )
    
    df['rainfall_ratio_7d_14d'] = np.where(
        df['rainfall_14d'] > 0,
        df['rainfall_7d'] / df['rainfall_14d'],
        0
    )
    
    df['rainfall_ratio_14d_30d'] = np.where(
        df['rainfall_30d'] > 0,
        df['rainfall_14d'] / df['rainfall_30d'],
        0
    )
    
    # === RAINFALL ACCELERATION ===
    df['rainfall_acceleration'] = np.where(
        df['rainfall_3d'] > 0,
        (df['rainfall_7d'] - df['rainfall_3d']) / df['rainfall_3d'],
        0
    )
    
    # === RAINFALL INTENSITY FLAGS ===
    df['high_short_term_rain'] = (df['rainfall_3d'] > 100).astype(int)
    df['sustained_heavy_rain'] = (df['rainfall_30d'] > 400).astype(int)
    
    # === TERRAIN INTERACTIONS ===
    df['slope_elevation_product'] = (df['slope'] * df['elevation']) / 1000
    df['steep_low_elevation'] = ((df['slope'] > 25) & (df['elevation'] < 2000)).astype(int)
    
    # === ASPECT WETNESS (North-facing: 315° to 45°) ===
    df['north_facing'] = (((df['aspect'] >= 315) | (df['aspect'] <= 45))).astype(int)
    
    # === VEGETATION-SLOPE STABILITY ===
    df['low_veg_steep'] = ((df['ndvi'] < 0.3) & (df['slope'] > 20)).astype(int)
    
    print(f"✅ Added 10 engineered features")
    print(f"   Total features now: {len(df.columns)}")
    
    return df

# Test it
if __name__ == "__main__":
    # Load your dataset
    df = pd.read_csv('landslides_combined.csv')
    
    print(f"Original features: {len(df.columns)}")
    print(f"Original shape: {df.shape}")
    
    # Engineer features
    df_engineered = engineer_features(df)
    
    print(f"\nNew features added:")
    new_features = [
        'rainfall_ratio_3d_7d', 'rainfall_ratio_7d_14d', 'rainfall_ratio_14d_30d',
        'rainfall_acceleration', 'high_short_term_rain', 'sustained_heavy_rain',
        'slope_elevation_product', 'steep_low_elevation', 'north_facing', 'low_veg_steep'
    ]
    for feat in new_features:
        print(f"   - {feat}")
    
    # Save
    df_engineered.to_csv('landslides_combined_engineered.csv', index=False)
    print(f"\n💾 Saved to: landslides_combined_engineered.csv")