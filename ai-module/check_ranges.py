import pandas as pd

df = pd.read_csv('landslides_combined.csv')

features = ['elevation', 'slope', 'aspect', 'ndvi', 'ndwi', 'soil_type', 
            'rainfall_3d', 'rainfall_7d', 'rainfall_14d', 'rainfall_30d']

print("LANDSLIDE POINTS (label=1):")
print(df[df['label']==1][features].describe())

print("\n" + "="*60)
print("NON-LANDSLIDE POINTS (label=0):")
print(df[df['label']==0][features].describe())