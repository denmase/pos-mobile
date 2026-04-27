# POS Mobile

App React Native (Expo) untuk backend Laravel POS ini.

## Fitur inti

- Login token-based via Laravel Sanctum
- Ringkasan dashboard mobile
- Katalog produk + filter kategori
- Cart kasir: tambah item, ubah qty, hapus item
- Hold / resume transaksi
- Checkout tunai, transfer bank, gateway, dan pay later
- Riwayat transaksi + detail transaksi
- Preview, print, dan share receipt PDF setelah checkout
- Quick add customer

## Menjalankan

1. Pastikan backend Laravel berjalan.
2. Jalankan migration baru untuk token Sanctum:

```bash
php artisan migrate
```

3. Salin env mobile:

```bash
cp .env.example .env
```

4. Install dependency dan jalankan Expo:

```bash
npm install
npm run web
```

Atau untuk device / emulator:

```bash
npm start
```

## Konfigurasi API

Gunakan URL dengan format:

```text
https://domainmu.com/api/mobile
```

App juga menyediakan field URL API langsung di halaman login supaya mudah pindah environment.
