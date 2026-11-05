# assets

Inventaris Admin untuk menambah, mencari, dan mengarsipkan aset, melihat foto privat dan riwayat, mencetak label QR, dan mengekspor hasil filter. Superadmin mengelola akun, kategori, ruangan, dan penetapan Gudang.

## Menjalankan secara lokal

Gunakan Node.js 22 atau lebih baru dan pnpm.

```sh
pnpm install
pnpm dev
```

Buka [Inventaris](http://localhost:3000/inventaris). Saat konfigurasi Supabase kosong, server pengembangan menampilkan data contoh. Untuk pratinjau dengan build produksi, set `ASSETS_DEMO=1` sebelum `pnpm start`. Mode itu selalu menggunakan data contoh, termasuk bila konfigurasi Supabase tersedia.

```sh
pnpm typecheck
pnpm build
```

## Menghubungkan Supabase

1. Untuk uji lokal, jalankan `supabase start` dengan Docker aktif. Di Docker Desktop Windows, jalankan `node scripts/start-supabase-local.cjs` agar port diterbitkan di `127.0.0.1`. Jika CLI belum ada di PATH, berikan path `supabase.exe` sebagai argumen. Untuk instans lokal yang sudah berjalan, gunakan `supabase migration up --local` untuk menerapkan migrasi baru. Pada proyek Supabase terpisah, terapkan migrasi di `supabase/migrations`, nonaktifkan pendaftaran publik, dan atur batas percobaan login di Auth.
2. Salin `.env.example` menjadi `.env.local`. Isi URL, publishable key, dan `SUPABASE_SERVICE_ROLE_KEY` dari instans yang sama. Gunakan `ASSETS_AUTH_DOMAIN=assets.test` untuk uji lokal atau domain internal yang dikendalikan pengelola untuk penggunaan kantor. Set `ASSETS_DEMO=0`.
3. Isi variabel sesi terminal `ASSETS_BOOTSTRAP_PASSWORD` dengan password sementara yang kuat, minimal 8 karakter dan maksimal 72 byte UTF-8. Jalankan `pnpm bootstrap:superadmin`. Username bawaan adalah `superadmin`; variabel `ASSETS_BOOTSTRAP_USERNAME` dan `ASSETS_BOOTSTRAP_NAME` dapat diisi sebelum bootstrap pertama.
4. Masuk menggunakan username dan password sementara, lalu ganti password. Di **Pengaturan dan Akun**, buat akun Admin atau Staf, tambah kategori dan ruangan, serta pilih tujuan Gudang.
5. Setelah migrasi terpasang, masuk sebagai Admin untuk membuka **Tambah aset**. Formulir menerima satu foto opsional dalam format JPEG, PNG, WebP, atau AVIF, hingga 4 MiB dan 25 megapiksel. Foto tersimpan di bucket privat `asset-photos`. Isi `ASSETS_COPYRIGHT_OWNER` saat nama pemegang hak cipta telah ditetapkan.

`SUPABASE_SERVICE_ROLE_KEY` digunakan di server dan skrip bootstrap. Simpan di konfigurasi privat seperti `.env.local`.

QR memakai format `assets:v1:<uuid-aset>` agar pemindahan ruangan, perubahan kode tampilan, dan perubahan domain aplikasi tidak mengubah identitas yang dicetak.

## Serah terima dan lokasi aset

Admin membuka **Kelola aset** dari detail aset untuk mengajukan serah terima, mencatat mutasi ruangan, atau mengonfirmasi pengembalian fisik ke Gudang. **Serah Terima** menampilkan pengajuan yang menunggu dan riwayatnya.

Staf menerima atau menolak pengajuan dari **Serah Terima**. Penolakan memerlukan alasan. Setelah diterima, aset muncul di **Aset Saya** milik penerima. Mutasi hanya mengubah ruangan. Pengembalian memindahkan aset ke Gudang dan mengosongkan pemegang.

## Foto contoh

Foto Dell XPS 13 berasal dari Tinh tế Photo dan dikodekan ulang ke WebP untuk pratinjau lokal. [Sumber dan lisensi CC0 1.0](https://commons.wikimedia.org/wiki/File:Dell_XPS_13_(2018)_(41250716281).jpg)
