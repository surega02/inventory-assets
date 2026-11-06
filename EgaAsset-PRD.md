# EgaAsset · PRD MVP

**EgaAsset** menggabungkan nama Ega dengan Asset. Aplikasi web internal ini mencatat aset kantor per unit, pemegang aktif, lokasi fisik, dan riwayatnya. Dokumen pendampingnya adalah [EgaAsset-ERD.md](EgaAsset-ERD.md).

## Tujuan dan cakupan

Admin bisa menemukan aset dan pemegangnya, mencatat serah terima dan perpindahan, mencocokkan inventaris dengan kondisi fisik, serta mengunduh laporan. Staf bisa melihat aset yang dipegang dan merespons serah terima. Lokasi menggunakan satu daftar ruangan, termasuk Gudang. MVP mencakup satu akun Admin operasional dengan akses ke semua ruangan. Impor Excel, pengelolaan cabang dan mutasi antar kantor berada di luar cakupan MVP.

## Akses

| Fitur | Superadmin | Admin | Staf |
|---|---|---|---|
| Pengaturan aplikasi dan pengelolaan akun | Ya | — | — |
| Master kategori dan ruangan, termasuk penetapan Gudang | Ya | Baca | — |
| Inventaris, foto, arsip, label QR, riwayat | Kelola | Kelola | Lihat detail aset yang dipegang |
| Pengajuan dan pembatalan serah terima | Ya | Ya | — |
| Respons serah terima | Lihat hasil | Lihat hasil | Terima atau tolak pengajuan yang ditujukan kepadanya |
| Pengembalian, mutasi ruangan, opname, ekspor | Ya | Ya | — |
| Aset Saya | Lihat aset yang dipegang | — | Lihat aset yang dipegang |

Superadmin dapat membuka semua menu utama. Menu Admin mencakup **Inventaris**, **Serah Terima**, dan **Stok Opname**. Menu Staf mencakup **Aset Saya** dan **Serah Terima**.

## Kebutuhan fungsional

### FR-01 · Akun dan login

- Form login hanya meminta username dan password. Username unik tanpa membedakan huruf besar-kecil. Normalisasi dengan trim dan lowercase serta validasi panjang 3–32 karakter dengan huruf ASCII, angka, titik, garis bawah, dan tanda hubung. Password diproses apa adanya.
- Superadmin awal dibuat melalui langkah bootstrap satu kali. Superadmin membuat akun Admin dan Staf, menetapkan password awal, serta bisa melakukan reset dan menonaktifkan akun. Default implementasi memakai password sementara minimal 8 karakter dengan ganti password wajib saat login pertama atau setelah reset. Sediakan logout.
- Registrasi publik, login sosial, dan pemulihan mandiri via email berada di luar MVP. Terapkan pembatasan percobaan login dan pesan generik untuk kredensial gagal. Penonaktifan dan reset mencabut akses sesi lama. Penonaktifan staf diblokir selama masih memegang aset atau punya pengajuan masuk yang menunggu.
- Pertahankan Supabase Auth untuk password dan sesi. Server mengubah username menjadi email internal melalui pemetaan deterministik memakai domain khusus yang dikendalikan pengelola. Akun dibuat melalui API admin dengan konfirmasi internal dan tanpa pengiriman email. Email internal tidak diminta di form. Credential admin Supabase hanya tersedia di server. Untuk MVP, username tetap setelah dibuat.

### FR-02 · Inventaris dan QR

- Admin membuat aset satu per satu dengan kode unik dari Excel. Wajib mengisi kode, nama, kategori, ruangan, dan kondisi. Serial number, merek/model, catatan, tanggal pembelian, harga perolehan, dan foto bersifat opsional. Default implementasi memakai IDR dalam rupiah utuh dan satu foto per aset. Nilai nol berarti gratis dan kolom kosong berarti belum diketahui.
- Aset baru aktif dengan pemegang kosong. Untuk mencatat pemegang awal, gunakan serah terima yang dikonfirmasi staf. Pencarian mencakup kode, nama, serial number, dan pemegang. Filter mencakup kategori, ruangan, kondisi, dan status inventaris.
- Kondisi fisik terdiri dari Baik, Rusak Ringan, dan Rusak Berat. Status inventaris terdiri dari Aktif dan Diarsipkan. Admin bisa mengarsipkan aset yang sudah dikembalikan dan bebas dari pengajuan tertunda. Riwayat tetap dapat dibaca dan aset diarsipkan keluar dari opname baru.
- Label cetak memuat QR berbasis ID aset yang stabil serta kode yang dapat dibaca. Scan dari layar opname mengenali QR aplikasi, membuka pemeriksaan, dan tetap memerlukan konfirmasi admin. Jika kamera ditolak atau QR gagal dibaca, admin bisa mencari manual. Gunakan HTTPS dan bucket foto privat.

### FR-03 · Serah terima

1. Admin memilih aset aktif dan staf aktif sebagai penerima. Satu aset memiliki paling banyak satu pengajuan Menunggu, baik untuk penyerahan awal maupun pergantian pemegang.
2. Selama Menunggu, pemegang dan ruangan aktif tetap tercatat. Admin dapat membatalkan pengajuan. Default implementasi menahan mutasi ruangan, pengembalian, dan arsip untuk aset yang masih menunggu agar konteks pengajuan tetap konsisten.
3. Hanya penerima yang dituju boleh menekan **Terima** atau **Tolak**. Terima mengubah pemegang, mencatat riwayat, dan menampilkan aset di **Aset Saya**. Ruangan tetap tercatat dan bisa dipindahkan melalui mutasi terpisah. Tolak mewajibkan alasan dan mempertahankan pemegang. Setelah Ditolak atau Dibatalkan, admin dapat membuat pengajuan baru.
4. Diterima, Ditolak, dan Dibatalkan merupakan hasil akhir. Perubahan status, pemegang, dan riwayat terkait diproses dalam satu transaksi database. Permintaan ulang atau respons bersamaan hanya menghasilkan satu perubahan yang sah.

### FR-04 · Pengembalian dan mutasi

- Admin mencatat pengembalian setelah barang diterima secara fisik. Sistem mengosongkan pemegang, memindahkan aset ke Gudang, dan mencatat kedua perubahan di riwayat. Staf menggunakan prosedur fisik pengembalian kantor.
- Mutasi mengubah ruangan tanpa mengganti pemegang. Riwayat menyimpan waktu, pelaku, serta nilai sebelum dan sesudah. Perubahan kondisi dan pengarsipan juga dicatat. Perubahan lokasi dan pemegang dilakukan melalui alur transaksi ini, termasuk ketika admin memperbaiki selisih opname.

### FR-05 · Stok opname

1. Admin membuka sesi per ruangan. Sistem menyalin daftar aset aktif beserta kode, nama, ruangan dan kondisi tercatat saat pembukaan. Default implementasi mengizinkan satu sesi terbuka per ruangan.
2. Admin memeriksa dari daftar atau scan QR, lalu mengonfirmasi **Ditemukan** beserta kondisi fisik. Jika aset dari ruangan lain ditemukan, sesi bisa menyimpan aset tambahan dengan ruangan yang tercatat saat temuan dibuat. Sistem menandai selisih lokasi atau kondisi berdasarkan pembanding tersimpan. Scan ulang membuka hasil yang sama.
3. Sebelum menutup sesi, admin melihat dan mengonfirmasi seluruh aset snapshot yang belum diperiksa sebagai **Tidak Ditemukan**. Sesi ditutup setelah semua hasil final. Hasil sesi tertutup bersifat baca saja. Perpindahan aset setelah sesi dibuka tidak mengubah daftar pembanding.
4. Temuan tetap tersimpan di sesi. Setelah lokasi atau kondisi diverifikasi, admin membuat mutasi lokasi atau pembaruan kondisi lewat transaksi terpisah.

### FR-06 · Export Excel

- Export inventaris mengikuti seluruh hasil filter aktif, termasuk lintas halaman. Isi minimal meliputi kode, nama, kategori, ruangan, pemegang, kondisi, status, dan data pembelian yang tersedia.
- Export per sesi opname memuat ruangan, waktu, status sesi, daftar aset, hasil fisik, selisih, dan catatan. Untuk sesi terbuka, hasil yang belum diperiksa tampil apa adanya. Tulis kode dan serial sebagai teks agar nol di depan tetap utuh, dan tulis masukan pengguna sebagai teks literal agar Excel tidak mengeksekusi formula.

## Stack dan batas implementasi

- Next.js App Router, TypeScript, Tailwind CSS dan shadcn/ui. Deploy satu aplikasi ke Vercel. Supabase menyediakan PostgreSQL, Auth, dan Storage.
- Validasi input dan otorisasi di server pada setiap request. Aktifkan RLS pada tabel yang terekspos. Staf hanya dapat mengakses detail aset miliknya dan data minimum untuk pengajuan yang ditujukan kepadanya. Harga perolehan, catatan internal, dan riwayat pemegang dibatasi untuk Admin.
- Simpan waktu sebagai timestamptz dan tampilkan dengan zona waktu Asia/Jakarta sebagai default. Berikan tampilan yang nyaman di HP untuk opname dan respons staf.
- Siapkan migrasi database, bootstrap Superadmin, contoh variabel lingkungan tanpa kredensial, dan langkah deployment. Urutan implementasi yang disarankan adalah auth dan master, inventaris dan QR, serah terima dan mutasi, lalu opname dan export.

## Kriteria penerimaan

| Skenario | Hasil yang diharapkan |
|---|---|
| Admin input kode yang sudah digunakan dengan kapitalisasi berbeda | Ditolak dan data lama tetap tersimpan. |
| Staf membuka URL aset orang lain atau merespons pengajuan orang lain | Akses ditolak oleh server. |
| Staf menerima pengalihan laptop dari Rina ke Budi | Budi menjadi pemegang aktif, aset hilang dari daftar Rina, dan riwayat tercatat sekali. |
| Staf menolak pengajuan dengan alasan kosong | Validasi gagal. Jika alasan valid, status Ditolak dan pemegang tetap. |
| Dua pengajuan dibuat untuk aset yang sama, atau Terima dan Batal tiba bersamaan | Hanya satu pengajuan tertunda atau satu hasil akhir yang sah. |
| Admin mencatat pengembalian fisik | Pemegang kosong, ruangan Gudang, dan transaksi ada di riwayat. |
| Admin scan aset dari ruangan lain atau aset yang sama dua kali | Temuan lokasi tercatat tanpa mengubah master dan satu aset punya satu baris dalam sesi. |
| Admin menutup sesi dengan aset yang belum diperiksa | Sistem meminta konfirmasi dan menyimpan Tidak Ditemukan setelah disetujui. |
| Admin export hasil filter atau sesi | Workbook terbuka dan barisnya sesuai cakupan. Kode seperti 0001 tetap utuh. |

## Referensi implementasi autentikasi

- [Supabase password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Supabase admin create user](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
