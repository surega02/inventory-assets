---
version: 1
slug: "app-inventaris-page-tsx"
primary_target: "app/inventaris/page.tsx"
related_targets: ["app/inventaris/[id]/page.tsx","app/inventaris/[id]/label/page.tsx","app/inventaris/tambah/page.tsx"]
---

# Inventaris Admin

Mode: Operate

Admin mencari kode atau nama, memastikan lokasi dan pemegang, membuka riwayat serta label QR, dan mengunduh semua hasil filter sebagai Excel. Detail menampilkan satu foto opsional. Nama aplikasi **assets**. Footer memuat pemberitahuan hak cipta. Nama pemegang hak cipta merupakan pengaturan deployment.

Formulir Tambah Aset mengutamakan kode, nama, kategori, ruangan, dan kondisi. Detail tambahan dan satu foto privat bersifat opsional. Simpan membuka detail dan label QR. Simpan dan tambah lagi membuka formulir kosong. Pada HP, isian ditata dalam satu kolom dan kesalahan tampil di dekat isian. Admin mengonfirmasi arsip dari detail aset, dengan riwayat yang tetap dapat dibuka.

## Direction contract

**THESIS.** Daftar inventaris terbaca seperti indeks, dengan satu foto di lembar detail untuk mengenali unit fisik.

**OWN-WORLD.** Putih nyaris netral, tinta gelap, garis tipis, grotesk yang jelas, angka tabular, lilac untuk baris terpilih. Foto dengan warna alami.

**STORY.** Cari kode, baca nama dan dua kolom ruangan serta pemegang, lalu buka detail, riwayat, atau label.

**FIRST VIEWPORT.** Di desktop, satu bidang kerja dengan pencarian dan filter di atas tabel. Pratinjau aset terpilih di kanan menjaga identitas, foto, dan fakta ringkas dalam satu pandangan. Di detail, identitas di kiri dan foto di kanan. HP menampilkan identitas, ruangan, dan pemegang lebih dulu. Aksen lilac menautkan baris aktif ke pratinjau.

**FORM.** Katalog Foto, pilihan penantang Design Annual dalam putaran pertama yang dikonfirmasi pengguna, seed `3a629523`. Code-first.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
