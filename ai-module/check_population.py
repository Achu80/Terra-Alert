import pandas as pd

df_landslides = pd.read_csv('landslide_ALL_features_north_india.csv.csv')

print("Landslide Population Stats:")
print(df_landslides['population'].describe())
print(f"\nMin: {df_landslides['population'].min()}")
print(f"Max: {df_landslides['population'].max()}")
print(f"Median: {df_landslides['population'].median()}")