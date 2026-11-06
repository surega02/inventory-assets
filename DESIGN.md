---
name: "assets"
description: "Katalog Foto untuk inventaris aset kantor."
colors:
  ground: "#f6f5f3"
  surface: "#fffefd"
  ink: "#222127"
  muted: "#625e68"
  line: "#dedbdc"
  field-border: "#ccc8cd"
  selected: "#ede7f7"
  accent: "#563982"
  accent-surface: "#f3eef9"
  pressed: "#38343e"
  inverse-ink: "#fff"
  good: "#35634e"
  warning: "#83500d"
  danger: "#953d38"
  preview-surface: "#fcfafc"
  photo-mat: "#efedf0"
  status-active-surface: "#eeedec"
  status-active-ink: "#4e4a51"
  status-archived-surface: "#e9e3ef"
  status-archived-ink: "#574865"
typography:
  display:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: "clamp(2.5rem, 5.3vw, 3.625rem)"
    fontWeight: 610
    lineHeight: 1
    letterSpacing: "-.04em"
  display-detail:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: "clamp(2.35rem, 4.2vw, 3.25rem)"
    fontWeight: 610
    lineHeight: 1
    letterSpacing: "-.04em"
  headline:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: "1.325rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-.022em"
  title:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: "1.7rem"
    fontWeight: 650
    lineHeight: 1.06
    letterSpacing: "-.022em"
  body:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: ".8125rem"
    fontWeight: 520
    lineHeight: 1.5
  control:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: ".875rem"
    fontWeight: 650
    lineHeight: 1.2
  code:
    fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace'
    fontSize: ".82rem"
    fontWeight: 600
    lineHeight: 1.5
  condition:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: ".75rem"
    fontWeight: 650
    lineHeight: 1.25
  status:
    fontFamily: '"Figtree Variable", system-ui, sans-serif'
    fontSize: ".6875rem"
    fontWeight: 660
    lineHeight: 1.15
rounded:
  control: "5px"
  surface: "12px"
  pill: "99px"
spacing:
  space-1: "8px"
  space-2: "16px"
  space-3: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.inverse-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.pressed}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-outline-hover:
    backgroundColor: "{colors.accent-surface}"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "47px"
  select-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "6px 27px 6px 10px"
  nav-current:
    textColor: "{colors.ink}"
    padding: "0 3px"
  index-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
  asset-preview:
    backgroundColor: "{colors.preview-surface}"
    rounded: "{rounded.surface}"
    padding: "{spacing.space-2}"
  index-row-selected:
    backgroundColor: "{colors.selected}"
  asset-photo:
    backgroundColor: "{colors.photo-mat}"
  condition-good:
    textColor: "{colors.good}"
    typography: "{typography.condition}"
  condition-minor-damage:
    textColor: "{colors.warning}"
    typography: "{typography.condition}"
  condition-major-damage:
    textColor: "{colors.danger}"
    typography: "{typography.condition}"
  status-active:
    backgroundColor: "{colors.status-active-surface}"
    textColor: "{colors.status-active-ink}"
    typography: "{typography.status}"
    rounded: "{rounded.pill}"
    padding: "3px 7px"
  status-archived:
    backgroundColor: "{colors.status-archived-surface}"
    textColor: "{colors.status-archived-ink}"
    typography: "{typography.status}"
    rounded: "{rounded.pill}"
    padding: "3px 7px"
---

# Sistem desain assets

## Overview

**Creative North Star: "Katalog Foto"**

Antarmuka **assets** mengambil bentuk katalog kerja. Bidang terang, teks gelap, dan garis tipis membantu Admin memindai identitas aset, ruangan, serta pemegang dalam satu alur baca.

Foto menampilkan unit fisik dalam warna aslinya. Bingkai bersiku memberi foto batas yang jelas, sementara label kecil membedakan foto aset dan foto contoh.

**Key Characteristics:**

- Permukaan terang dengan garis tipis dan aksen lilac untuk orientasi.
- Figtree untuk teks antarmuka, huruf monospace untuk pengenal, dan angka tabular untuk data yang dipindai berurutan.
- Kondisi fisik dan status inventaris menggunakan penanda visual yang berbeda.

## Colors

### Primary

- **Ungu tinta** (`accent`) muncul pada pengenal aset, tautan pendukung, menu aktif, dan cincin fokus.
- **Lilac pilihan** (`selected`) menandai baris yang terhubung dengan pratinjau desktop. **Lilac pucat** (`accent-surface`) mendukung sorotan tombol berbingkai dan penanda data contoh.

### Neutral

- **Kertas hangat** (`ground`) menjadi latar aplikasi. **Putih lembut** (`surface`) mengangkat indeks dan kontrol, sementara permukaan pratinjau (`preview-surface`) membawa sedikit rona lilac.
- **Tinta arang** (`ink`) memuat teks utama dan bidang tombol utama. Tinta redup (`muted`) memberi tingkat baca kedua pada label, bantuan, dan keterangan. Tinta tombol berubah lebih terang saat disorot (`pressed`).
- Garis permukaan (`line`) memisahkan isi. Garis kontrol (`field-border`) memberi batas yang lebih tegas pada bidang yang dapat dioperasikan.
- Hijau, oker, dan merah tua (`good`, `warning`, `danger`) menyertai label kondisi Baik, Rusak Ringan, dan Rusak Berat. Pil status Aktif memakai abu netral, sedangkan Diarsipkan memakai kelabu keunguan.

**Aturan Lilac untuk Orientasi.** Pakai lilac untuk pengenal, fokus, navigasi aktif, dan seleksi yang sedang ditampilkan.

## Typography

Figtree Variable dipakai pada judul, isi, dan kontrol. Huruf monospace dipakai pada kode aset dan nomor seri yang tercatat. Angka tabular dipakai pada kode, waktu riwayat, dan paginasi.

- **Judul halaman** memakai bobot 610 dan spasi huruf rapat. Di HP, judul daftar dan detail memakai skala fluida 2–2.5rem.
- **Judul bagian** memakai bobot 650 dengan ukuran 1.325rem di desktop dan 1.25rem di HP. Nama aset di pratinjau lebih besar (1.7rem).
- **Isi** memakai dasar 15px di desktop dan 16px di HP, dengan tinggi baris 1.5. Nama aset dalam indeks lebih tebal dari nama kategori di bawahnya.
- **Label** menurunkan kontras melalui tinta redup. Ruangan dan pemegang memakai label kecil dengan nilai yang lebih tebal. Petunjuk pencarian berukuran .8125rem di desktop dan .875rem di HP.

**Aturan Pengenal Mudah Dipindai.** Pertahankan huruf monospace dan angka tabular pada kode aset saat pengenal berpindah dari daftar ke detail.

## Layout

- Bingkai utama dibatasi 1320px. Lebarnya dikurangi 96px dari ruang kerja pada layar lebar, 56px saat ruang kerja selebar 1180px atau kurang, dan 32px pada tata letak HP.
- Saat ruang kerja lebih lebar dari 1180px, indeks dan pratinjau terpilih berbagi satu kisi dengan jarak 24px. Pratinjau menempati sedikitnya 300px. Pada ruang kerja yang lebih sempit, tautan nama aset langsung membuka detail.
- Tata letak HP berlaku sampai lebar 680px, serta pada layar sentuh mendatar sampai lebar 960px dan tinggi 480px. Filter menjadi dua kolom. Baris aset menempatkan kode dan status di atas, nama selebar baris, lalu ruangan dan pemegang berdampingan.
- Detail menempatkan identitas dan foto dalam dua kolom pada layar lebar. Di HP, identitas tampil sebelum foto dan riwayat menjadi satu kolom.

## Elevation & Depth

Bidang kerja datar. Perbedaan rona latar, permukaan, dan alas foto memberi kedalaman, sementara garis 1px memisahkan panel, baris, dan kelompok fakta. Fokus menggunakan outline ungu 2px yang terpisah dari tepi kontrol.

## Shapes

Kontrol memakai sudut kecil (5px), panel indeks dan pratinjau memakai sudut lebih lembut (12px), dan penanda status berbentuk pil (99px). Foto tetap bersudut siku, dengan tanda sudut 14px pada kiri atas dan kanan bawah.

## Components

### Tombol

Tombol utama memakai bidang tinta arang dan teks putih. Tombol berbingkai memakai permukaan terang dan garis kontrol, lalu mendapat rona lilac saat disorot. Tinggi minimum tombol 42px di desktop dan 44px di HP. Tombol ikon berbentuk persegi, dengan garis dan radius yang sama.

### Pencarian dan filter

Pencarian memakai bidang terang setinggi 47px dengan ikon kaca pembesar dan garis kontrol. Fokus mengelilingi wadah input. Filter memakai pilihan native berlabel dengan ikon chevron. Tinggi minimum pilihan meningkat dari 38px menjadi 44px pada HP.

### Navigasi

Di desktop, identitas **assets**, menu peran, dan kontrol akun berada di sidebar kiri. Pada layar selebar 900px atau kurang dan HP mendatar, identitas dan akun berada di bagian atas, sedangkan menu berikon dan berlabel menetap di bawah. Permukaan lilac menandai menu aktif. Ruang tambahan di bawah konten menjaga footer dan tindakan tetap bisa dijangkau.

### Penanda kondisi dan status

Kondisi memakai titik 6px dan nama kondisi dalam warna yang sama. Status inventaris memakai pil ringkas berlabel Aktif atau Diarsipkan. Penanda Data contoh memakai pil lilac bergaris.

### Indeks dan pratinjau

Indeks memakai permukaan terang dan pemisah antarbaris. Pada desktop lebar, warna baris aktif menautkan indeks dengan pratinjau. Pratinjau mengulang kode, nama, kategori, kondisi, dan status, lalu menampilkan foto, pasangan fakta, dan tindakan.

### Foto aset

Foto memakai alas berasio 3:2 dan `object-fit: contain` agar seluruh unit terlihat. Dua tanda sudut mengapit gambar dan keterangan rata kanan berada di bawahnya. Foto yang belum tersedia atau gagal dimuat tetap memakai alas yang sama dengan pesan di tengah.

## Do's and Don'ts

- **Lakukan** tampilkan ruangan tercatat dan pemegang aktif sebagai dua fakta berlabel terpisah.
- **Lakukan** pasangkan warna kondisi dengan nama kondisi yang terbaca.
- **Lakukan** pertahankan warna alami dan proporsi foto aset.
- **Hindari** penggunaan satu penanda visual untuk kondisi fisik dan status inventaris.
