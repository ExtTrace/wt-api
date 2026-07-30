# ⚡ AWT API - Vercel Serverless Backend for IoT Climate Monitoring

API Serverless untuk mengelola komunikasi telemetry sensor ESP32, kalkulasi Dew Point & Risiko Jamur, sakelar power remote, serta manajemen lokasi.

---

## 🔑 Environment Variables for Vercel Deployment

Saat mendepoy `awt-api` ke **Vercel**, tambahkan variabel berikut di **Project Settings ➔ Environment Variables**:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

> ⚠️ **Catatan Penting:** Nama environment variable di Vercel **harus disamakan 100%** dengan yang digunakan di lokal (`SUPABASE_URL` dan `SUPABASE_PUBLISHABLE_KEY`).

---

## 🔌 API Endpoints Summary

### 1. Intake & Log Telemetry
- **`POST /api/iot/telemetry`**
  - **Body:** `{"device_id": "ESP32-ROOM-01", "temperature": 27.5, "humidity": 62.5}`
  - **Function:** Menerima data sensor dari ESP32, menghitung Dew Point & Mould Risk, menyimpan ke Supabase DB.
- **`GET /api/iot/telemetry?page=1&limit=20&location_id=ALL`**
  - **Function:** Mengambil riwayat telemetry dengan paginasi RESTful & metadata JSON.

### 2. Sakelar Power Remote
- **`POST /api/device-toggle`**
  - **Body:** `{"device_id": "ESP32-ROOM-01", "is_active": true}`
- **`GET /api/device-toggle?device_id=ESP32-ROOM-01`**

### 3. Master Lokasi & Device
- **`GET /api/locations`**
- **`POST /api/locations`**
- **`POST /api/device-location`**

---

## 🛠️ Build & Type Check
```bash
npx tsc --noEmit
```