import pandas as pd

df = pd.read_csv('landslides_combined.csv')

# Show all column names
print("All columns in dataset:")
print(list(df.columns))

# Show just the feature columns (after dropping metadata)
metadata_cols = ['event_id', 'point_id', 'event_date', 'latitude', 'longitude', 
                 'landslide_trigger', 'landslide_size', 'fatality_count', 
                 'admin_division_name', 'system:index', '.geo', 'label',
                 'road_distance_m', 'population']

features = [col for col in df.columns if col not in metadata_cols]
print("\nActual feature order:")
print(features)