# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, TypeScript, Tailwind CSS, dan shadcn/ui. Target deployment adalah satu aplikasi di Vercel. Supabase menyediakan PostgreSQL, Auth, dan Storage.

## Users

- **Admin** adalah pengguna utama. Ia mencari aset dan pemegangnya, mencatat serah terima dan perpindahan, mencocokkan inventaris dengan temuan fisik, dan mengunduh laporan. Saat kebutuhan desain bertabrakan, prioritaskan kelancaran pekerjaan Admin. MVP menyediakan satu akun Admin operasional dengan akses ke semua ruangan.
- **Staf** melihat aset di **Aset Saya** serta menerima atau menolak pengajuan serah terima yang ditujukan kepadanya.
- **Superadmin** mengelola akun, pengaturan aplikasi, kategori, dan ruangan, termasuk menetapkan Gudang.

## Product Purpose

**assets** adalah aplikasi internal untuk mencatat setiap unit aset kantor, lokasi fisik, pemegang aktif, kondisi, dan riwayatnya. Pencatatan berhasil jika Admin dapat mengetahui keberadaan dan penanggung jawab aset, menelusuri perubahannya, serta membandingkan catatan dengan kondisi fisik saat stok opname.

## Positioning

EgaAsset melanjutkan pencatatan aset berkode dari Excel dengan konfirmasi serah terima oleh penerima dan pemeriksaan fisik per ruangan. Sistem mencatat pemegang dan ruangan sebagai dua informasi terpisah, sehingga perubahan salah satunya dapat ditelusuri melalui alur yang sesuai.

## Operating Context

- Admin mencatat aset satu per satu menggunakan kode dari Excel. Gudang tercatat dalam daftar ruangan yang sama dan menjadi tujuan pengembalian setelah aset diterima secara fisik.
- Stok opname dimulai dari daftar aset aktif yang tercatat saat sesi per ruangan dibuka. Admin dapat memeriksa lewat daftar atau pindai QR di HP, dengan pencarian manual jika kamera atau QR gagal. Hasil pemeriksaan memerlukan konfirmasi Admin. Selisih dicatat di sesi dan koreksi inventaris dilakukan lewat transaksi terpisah.
- Staf dapat merespons serah terima lewat HP. Waktu ditampilkan dalam zona Asia/Jakarta secara bawaan.

## Capabilities and Constraints

- Inventaris mencakup pencarian, filter, foto privat, label QR dengan ID aset yang stabil dan kode terbaca, pengarsipan, dan riwayat. Kode aset unik tanpa membedakan kapitalisasi. Kondisi fisik (**Baik**, **Rusak Ringan**, **Rusak Berat**) dicatat terpisah dari status inventaris (**Aktif**, **Diarsipkan**).
- Satu aset dapat memiliki satu pengajuan **Menunggu**. Pemegang berubah saat penerima menekan **Terima**. Penolakan mewajibkan alasan. Admin dapat membatalkan pengajuan, memindahkan ruangan, dan mencatat pengembalian sesuai aturan transaksi masing-masing.
- Stok opname menyimpan pembanding awal, hasil pemeriksaan, dan selisih lokasi atau kondisi. Admin mengonfirmasi aset yang belum diperiksa sebagai **Tidak Ditemukan** sebelum menutup sesi. Hasil sesi tertutup bersifat baca saja.
- Ekspor Excel mencakup seluruh hasil filter inventaris atau satu sesi opname. Kode dan nomor seri diperlakukan sebagai teks agar nol di depan tetap utuh. Impor Excel, pengelolaan cabang, dan mutasi antar kantor berada di luar MVP.
- Login internal memakai username dan password. Otorisasi diperiksa di server. Staf hanya dapat membuka aset yang sedang dipegangnya dan data minimum dari pengajuan yang ditujukan kepadanya. Harga perolehan, catatan internal, dan riwayat pemegang hanya tersedia bagi Admin.

## Brand Commitments

Nama yang tampil di aplikasi adalah **assets**. Cantumkan pemberitahuan hak cipta saat implementasi. Pemegang hak cipta belum ditetapkan.

## Evidence on Hand

- [PRD MVP](EgaAsset-PRD.md) memuat cakupan fitur, peran, istilah, dan skenario penerimaan.
- [ERD MVP](EgaAsset-ERD.md) memuat model data, nilai status, dan aturan integritas transaksi.

## Product Principles

- Utamakan pekerjaan Admin untuk menemukan, memperbarui, dan memeriksa aset.
- Gunakan konfirmasi penerima sebagai dasar perubahan pemegang aktif.
- Simpan riwayat perubahan aset dan pembanding opname agar keputusan dapat ditelusuri.
- Pastikan pemeriksaan fisik dan respons staf dapat diselesaikan melalui HP.
