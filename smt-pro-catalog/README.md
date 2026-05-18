# SMT Pro Catalog

This repository contains a Node.js backend and a Flutter frontend for a product catalog application.

## Structure

- `backend/` - Express API with MongoDB, Cloudinary uploads, product/category/dashboard modules.
- `flutter_app/` - Flutter app using Riverpod, GoRouter, Dio, and local storage.

## Backend

### Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in MongoDB and Cloudinary credentials.
3. Install dependencies:

```bash
cd backend
npm install
```

### Run

```bash
npm run dev
```

### Docker

```bash
docker-compose up --build
```

## Continuous integration

This repository includes a GitHub Actions workflow at `.github/workflows/ci.yml`.
It runs backend linting and Flutter analysis + tests on every push and pull request.

## Flutter app

### Setup

```bash
cd flutter_app
flutter pub get
```

### Run

```bash
git clone <repo-url>
cd flutter_app
flutter pub get
flutter run
```

### Running locally

If you run the app on an Android emulator, the app now automatically uses `http://10.0.2.2:5000/api/v1` for the backend.

If you run on a physical device, `localhost` still refers to the device, so pass your computer IP instead:

```bash
flutter run -d <device-id> --dart-define=API_BASE_URL=http://<your-pc-ip>:5000/api/v1
```

To rebuild and reinstall the app on your phone, run:

```bash
cd flutter_app
flutter clean
flutter pub get
flutter run -d <device-id> --release --dart-define=API_BASE_URL=http://<your-pc-ip>:5000/api/v1
```

If you prefer a standalone APK, build and install it with:

```bash
cd flutter_app
flutter clean
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL=http://<your-pc-ip>:5000/api/v1
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

To find your PC IP on Windows, use `ipconfig` and use the IPv4 address from the active network adapter.

## Notes

- Backend API base URL is configured by `flutter_app/lib/config/app_config.dart` and exposed via `flutter_app/lib/core/constants/api_constants.dart`.
- The backend uses `backend/.env` for sensitive configuration values and `backend/.env.example` as a template.
- The root `.gitignore` now excludes `node_modules`, logs, Flutter build output, and editor files.
