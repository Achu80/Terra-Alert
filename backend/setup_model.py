"""
One-command setup for linking your model
"""
import os
import sys

def main():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                    MODEL SETUP WIZARD                                ║
╚══════════════════════════════════════════════════════════════════════╝

This wizard will help you integrate your trained model with the backend.

""")
    
    # Step 1: Get model folder path
    print("STEP 1: Locate Your Model")
    print("-" * 70)
    print("\nWhere is your trained model located?")
    print("Example: C:/Users/YourName/Documents/ML_Model")
    print("         ../ML_Model")
    print("         /home/user/models")
    
    model_folder = input("\nEnter path to your model folder: ").strip().strip('"').strip("'")
    
    if not os.path.exists(model_folder):
        print(f"\n✗ Error: Folder not found: {model_folder}")
        return
    
    print(f"\n✓ Found folder: {model_folder}")
    
    # Step 2: Link model
    print("\n" + "=" * 70)
    print("STEP 2: Linking Model Files")
    print("-" * 70)
    
    from ml.link_model import link_model_folder
    success = link_model_folder(model_folder)
    
    if not success:
        print("\n✗ Failed to link model folder")
        return
    
    # Step 3: Find model files
    print("\n" + "=" * 70)
    print("STEP 3: Analyzing Model")
    print("-" * 70)
    
    models_dir = os.path.join('ml', 'models')
    model_files = [f for f in os.listdir(models_dir) 
                   if f.endswith(('.pkl', '.pickle', '.joblib')) and not f.startswith('.')]
    
    if not model_files:
        print("\n⚠ No .pkl files found")
        print("   Your model might be in a different format")
        print("   Please check ml/models/ folder")
        return
    
    print(f"\nFound {len(model_files)} model file(s):")
    for i, f in enumerate(model_files, 1):
        print(f"  {i}. {f}")
    
    # Step 4: Analyze first model
    if len(model_files) == 1:
        model_to_analyze = model_files[0]
    else:
        print("\nWhich model should I analyze?")
        choice = input(f"Enter number (1-{len(model_files)}): ").strip()
        try:
            model_to_analyze = model_files[int(choice) - 1]
        except:
            model_to_analyze = model_files[0]
    
    print(f"\nAnalyzing: {model_to_analyze}")
    print("-" * 70)
    
    model_path = os.path.join(models_dir, model_to_analyze)
    
    from ml.analyze_model import analyze_model, suggest_gee_mapping
    model = analyze_model(model_path)
    
    if model and hasattr(model, 'feature_names_in_'):
        feature_names = list(model.feature_names_in_)
        suggest_gee_mapping(feature_names)
        
        # Step 5: Generate configuration
        print("\n" + "=" * 70)
        print("STEP 4: Generating Configuration")
        print("-" * 70)
        
        config_file = os.path.join(models_dir, 'model_config.txt')
        with open(config_file, 'w') as f:
            f.write("MODEL CONFIGURATION\n")
            f.write("=" * 70 + "\n\n")
            f.write(f"Model File: {model_to_analyze}\n")
            f.write(f"Number of Features: {len(feature_names)}\n\n")
            f.write("Feature Order:\n")
            for i, name in enumerate(feature_names, 1):
                f.write(f"{i}. {name}\n")
        
        print(f"\n✓ Configuration saved to: {config_file}")
    
    # Final instructions
    print("\n" + "=" * 70)
    print("SETUP COMPLETE!")
    print("=" * 70)
    
    print("\nNext Steps:")
    print("\n1. Review the analysis above")
    print("\n2. Update services/gee_service.py to fetch required features")
    print("   See: docs/LINK_YOUR_MODEL.md for examples")
    print("\n3. Update utils/data_processor.py with correct FEATURE_ORDER")
    print("\n4. Test integration:")
    print("   python tests/test_ai_integration.py")
    print("\n5. Start server:")
    print("   python app.py")
    print("\n")

if __name__ == "__main__":
    main()
