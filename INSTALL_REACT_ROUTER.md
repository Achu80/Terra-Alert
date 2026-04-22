# Install React Router DOM

## Method 1: Using the Batch File (Easiest)

1. Navigate to the `frontend` folder in File Explorer
2. Double-click `install-router.bat`
3. Wait for installation to complete
4. Press any key to close

## Method 2: Using Command Prompt

1. Press `Win + R`, type `cmd`, press Enter
2. Run these commands:

```bash
cd "D:\VS-Code projects\GeoSafe\frontend"
npm install react-router-dom
```

## Method 3: Fix PowerShell (One-time fix)

If you want to use PowerShell in the future:

1. Open PowerShell as Administrator
2. Run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
3. Type `Y` and press Enter
4. Now you can use npm in PowerShell:
```powershell
cd "D:\VS-Code projects\GeoSafe\frontend"
npm install react-router-dom
```

## Verify Installation

After installation, check if it worked:

```bash
cd "D:\VS-Code projects\GeoSafe\frontend"
npm list react-router-dom
```

You should see:
```
react-router-dom@6.22.0
```

## What's Installed

- `react-router-dom` - Routing library for React
- Enables URL-based navigation
- Provides `useNavigate`, `Link`, `Route` components
- Better browser history management
- Shareable URLs for different pages

## After Installation

1. Restart your Vite dev server (if running):
   - Press `Ctrl + C` in the terminal
   - Run `npm run dev` again

2. Refresh your browser

3. The app should now work with proper routing!

## Benefits of React Router

✅ **URL-based navigation** - Each page has its own URL
✅ **Browser back/forward** - Works properly
✅ **Bookmarkable pages** - Users can bookmark specific pages
✅ **Lazy loading** - Pages load only when needed
✅ **Better UX** - Smoother navigation experience
✅ **SEO friendly** - Better for search engines

## Routes in Your App

- `/` - Home (Dashboard overview)
- `/map` - Map Explorer
- `/dashboard` - Analytics Dashboard
- `/report` - Risk Report
- `/history` - Historical Data
- `/sources` - Data Sources
- `/settings` - Settings

## Troubleshooting

### Error: "Cannot find module 'react-router-dom'"
- Run the installation again
- Make sure you're in the `frontend` folder
- Restart the dev server

### Error: "npm is not recognized"
- Node.js is not installed or not in PATH
- Install Node.js from https://nodejs.org/
- Restart your terminal after installation

### Still having issues?
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` to reinstall everything
