import os
V2_DIR = os.path.dirname(os.path.abspath(__file__))   # ai-module/v2
AI_DIR = os.path.dirname(V2_DIR)                       # ai-module

import pandas as pd

df = pd.read_csv(os.path.join(AI_DIR, 'data', 'v2', 'landslides_combined.csv'))

print("Soil type range in dataset:")
print(f"Min: {df['soil_type'].min()}")
print(f"Max: {df['soil_type'].max()}")
print(f"Mean: {df['soil_type'].mean():.2f}")
print(f"\nValue counts:")
print(df['soil_type'].value_counts().head(10))