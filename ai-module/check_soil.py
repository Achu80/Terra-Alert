import pandas as pd

df = pd.read_csv('landslides_combined.csv')

print("Soil type range in dataset:")
print(f"Min: {df['soil_type'].min()}")
print(f"Max: {df['soil_type'].max()}")
print(f"Mean: {df['soil_type'].mean():.2f}")
print(f"\nValue counts:")
print(df['soil_type'].value_counts().head(10))