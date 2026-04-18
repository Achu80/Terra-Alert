import pandas as pd

# Load datasets
df_landslides = pd.read_csv('landslide_ALL_features_north_india.csv.csv')
df_non_landslides = pd.read_csv('non_landslide_constrained_north_india.csv')

# Add label column if missing
if 'label' not in df_landslides.columns:
    df_landslides['label'] = 1

if 'label' not in df_non_landslides.columns:
    df_non_landslides['label'] = 0

# Combine
df_combined = pd.concat([df_landslides, df_non_landslides], ignore_index=True)

print(f"Combined dataset shape: {df_combined.shape}")
print(f"\nClass distribution:\n{df_combined['label'].value_counts()}")
print(f"\nColumns: {list(df_combined.columns)}")

# Save
df_combined.to_csv('landslides_combined.csv', index=False)
print("\nSuccessfully saved as landslides_combined.csv")
