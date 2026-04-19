"""
Link your existing model folder to the backend
Creates symbolic link or copies model files
"""
import os
import shutil
import sys

def link_model_folder(source_folder):
    """
    Link or copy model folder to backend
    
    Args:
        source_folder: Path to your model folder
    """
    print("=" * 70)
    print("LINKING MODEL FOLDER")
    print("=" * 70)
    
    # Validate source folder
    if not os.path.exists(source_folder):
        print(f"\n✗ Error: Folder not found: {source_folder}")
        return False
    
    print(f"\nSource folder: {source_folder}")
    
    # List files in source folder
    files = os.listdir(source_folder)
    print(f"\nFiles found: {len(files)}")
    for f in files:
        print(f"  - {f}")
    
    # Find model files
    model_files = [f for f in files if f.endswith(('.pkl', '.pickle', '.h5', '.pt', '.pth', '.joblib'))]
    
    if not model_files:
        print("\n⚠ Warning: No model files found (.pkl, .h5, .pt)")
        print("   Looking for any Python files...")
        model_files = [f for f in files if f.endswith('.py')]
    
    print(f"\nModel files found: {len(model_files)}")
    for f in model_files:
        print(f"  ✓ {f}")
    
    # Target directory
    target_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"\nTarget directory: {target_dir}")
    
    # Copy files
    print("\nCopying files...")
    copied = 0
    
    for filename in model_files:
        source_file = os.path.join(source_folder, filename)
        target_file = os.path.join(target_dir, filename)
        
        try:
            shutil.copy2(source_file, target_file)
            print(f"  ✓ Copied: {filename}")
            copied += 1
        except Exception as e:
            print(f"  ✗ Error copying {filename}: {e}")
    
    # Also copy any feature name files
    feature_files = [f for f in files if 'feature' in f.lower() and f.endswith(('.txt', '.json', '.csv'))]
    for filename in feature_files:
        source_file = os.path.join(source_folder, filename)
        target_file = os.path.join(target_dir, filename)
        
        try:
            shutil.copy2(source_file, target_file)
            print(f"  ✓ Copied: {filename}")
            copied += 1
        except Exception as e:
            print(f"  ✗ Error copying {filename}: {e}")
    
    print(f"\n✓ Copied {copied} files successfully")
    
    # List what's now in target directory
    print(f"\nFiles in {target_dir}:")
    for f in os.listdir(target_dir):
        if not f.startswith('.'):
            print(f"  - {f}")
    
    return True

def main():
    """Main function"""
    print("\n" + "=" * 70)
    print("MODEL FOLDER LINKER")
    print("=" * 70)
    
    if len(sys.argv) > 1:
        source_folder = sys.argv[1]
    else:
        print("\nUsage: python link_model.py <path_to_your_model_folder>")
        print("\nExample:")
        print("  python link_model.py ../ML_Model")
        print("  python link_model.py C:/Users/YourName/Documents/my_model")
        
        source_folder = input("\nEnter path to your model folder: ").strip()
        
        # Remove quotes if user copied path with quotes
        source_folder = source_folder.strip('"').strip("'")
    
    # Convert to absolute path
    source_folder = os.path.abspath(source_folder)
    
    success = link_model_folder(source_folder)
    
    if success:
        print("\n" + "=" * 70)
        print("NEXT STEPS")
        print("=" * 70)
        print("\n1. Analyze your model:")
        print("   python ml/analyze_model.py ml/models/your_model.pkl")
        print("\n2. Check required features")
        print("\n3. Update GEE service to fetch those features")
        print("\n4. Test integration:")
        print("   python tests/test_ai_integration.py")
        print("\n")

if __name__ == "__main__":
    main()
