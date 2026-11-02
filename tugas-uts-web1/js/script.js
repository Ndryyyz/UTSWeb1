// script.js - Logika aplikasi BukuKu (DOM, validasi form, modal, alert)
// Setiap halaman memakai atribut <body data-page="..."> untuk memilih fungsi init.
// Data awal berasal dari data.js: dataPengguna, dataKatalogBuku, dataTracking.

/* =========================================================
   1. HELPER UMUM
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Urutan tahap pengiriman untuk progress bar
const tahapPengiriman = ["Pesanan Dibuat", "Dikemas", "Dikirim", "Dalam Perjalanan", "Diterima"];

function formatRupiah(angka) {
  return "Rp " + Number(angka).toLocaleString("id-ID");
}
// "Rp 180.000" -> 180000
function parseRupiah(teks) {
  return Number(String(teks).replace(/\D/g, "")) || 0;
}

function escapeHTML(teks) {
  const d = document.createElement("div");
  d.textContent = teks;
  return d.innerHTML;
}

function simpan(kunci, nilai) { localStorage.setItem(kunci, JSON.stringify(nilai)); }
function ambil(kunci, bawaan) {
  try {
    const v = JSON.parse(localStorage.getItem(kunci));
    return v === null ? bawaan : v;
  } catch (e) { return bawaan; }
}

// Gambar cadangan (SVG) bila file cover belum ada di folder img/
function gambarCadangan(judul) {
  const huruf = escapeHTML((judul || "?").charAt(0).toUpperCase());
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='88' height='116'><rect width='88' height='116' rx='8' fill='#4f46e5'/><rect x='8' y='8' width='72' height='100' rx='4' fill='none' stroke='#f59e0b' stroke-width='3'/><text x='44' y='72' font-size='44' text-anchor='middle' fill='#fff' font-family='Arial'>${huruf}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function buatGambar(buku) {
  const img = document.createElement("img");
  img.className = "cover";
  img.alt = "Sampul " + buku.namaBarang;
  img.src = buku.cover;
  img.onerror = function () { this.onerror = null; this.src = gambarCadangan(buku.namaBarang); };
  return img;
}

// Toast (notifikasi kecil)
function toast(pesan, jenis = "info") {
  let area = $("#toast-area");
  if (!area) {
    area = document.createElement("div");
    area.id = "toast-area";
    document.body.appendChild(area);
  }
  const t = document.createElement("div");
  t.className = "toast " + jenis;
  t.textContent = pesan;
  area.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// Modal
function bukaModal(id) { const m = document.getElementById(id); if (m) m.classList.add("open"); }
function tutupModal(id) { const m = document.getElementById(id); if (m) m.classList.remove("open"); }
function pasangModal() {
  $$("[data-open]").forEach(el => el.addEventListener("click", () => bukaModal(el.dataset.open)));
  $$("[data-close]").forEach(el => el.addEventListener("click", () => tutupModal(el.dataset.close)));
  $$(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) m.classList.remove("open"); }));
  document.addEventListener("keydown", e => { if (e.key === "Escape") $$(".modal.open").forEach(m => m.classList.remove("open")); });
}

// Validasi form
function tandaiError(input, pesan) {
  input.classList.add("invalid");
  const slot = input.parentElement.querySelector(".error-msg");
  if (slot) slot.textContent = pesan;
}
function bersihkanError(form) {
  $$(".invalid", form).forEach(i => i.classList.remove("invalid"));
  $$(".error-msg", form).forEach(e => e.textContent = "");
}
const polaEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Data yang bisa berubah disimpan di localStorage agar tetap ada saat pindah halaman
function ambilKatalog() {
  return ambil("katalogV2", JSON.parse(JSON.stringify(dataKatalogBuku)));
}
function ambilPengguna() {
  return dataPengguna.concat(ambil("penggunaBaru", []));
}
function ambilPesananBaru() { return ambil("pesananV2", []); }

// Gabungan data tracking dosen + pesanan baru (kunci: nomorDO)
function semuaTracking() {
  const gabung = Object.assign({}, dataTracking);
  ambilPesananBaru().forEach(p => { gabung[p.nomorDO] = p; });
  return gabung;
}

// Proteksi halaman: wajib login
function cekLogin() {
  const user = ambil("userLogin", null);
  if (!user) { window.location.href = "index.html"; return null; }
  const slot = $("#nama-user");
  if (slot) slot.textContent = user.nama;
  const keluar = $("#btn-logout");
  if (keluar) keluar.addEventListener("click", e => {
    e.preventDefault();
    localStorage.removeItem("userLogin");
    window.location.href = "index.html";
  });
  return user;
}

/* =========================================================
   2. HALAMAN LOGIN (index.html)
   ========================================================= */
function initLogin() {
  pasangModal();
  if (ambil("userLogin", null)) { window.location.href = "dashboard.html"; return; }

  const form = $("#form-login");
  form.addEventListener("submit", e => {
    e.preventDefault();
    bersihkanError(form);
    const email = form.email.value.trim();
    const pass = form.password.value;
    let ok = true;
    if (!email) { tandaiError(form.email, "Email wajib diisi"); ok = false; }
    else if (!polaEmail.test(email)) { tandaiError(form.email, "Format email tidak valid"); ok = false; }
    if (!pass) { tandaiError(form.password, "Password wajib diisi"); ok = false; }
    if (!ok) return;

    const user = ambilPengguna().find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (!user) {
      alert("Email/password yang anda masukkan salah");
      return;
    }
    simpan("userLogin", { nama: user.nama, email: user.email, role: user.role });
    window.location.href = "dashboard.html";
  });

  // Modal: Daftar
  const formDaftar = $("#form-daftar");
  formDaftar.addEventListener("submit", e => {
    e.preventDefault();
    bersihkanError(formDaftar);
    const nama = formDaftar.nama.value.trim();
    const email = formDaftar.email.value.trim();
    const pass = formDaftar.password.value;
    const ulang = formDaftar.ulang.value;
    let ok = true;
    if (nama.length < 3) { tandaiError(formDaftar.nama, "Nama minimal 3 karakter"); ok = false; }
    if (!polaEmail.test(email)) { tandaiError(formDaftar.email, "Format email tidak valid"); ok = false; }
    else if (ambilPengguna().some(u => u.email.toLowerCase() === email.toLowerCase())) { tandaiError(formDaftar.email, "Email sudah terdaftar"); ok = false; }
    if (pass.length < 6) { tandaiError(formDaftar.password, "Password minimal 6 karakter"); ok = false; }
    if (ulang !== pass) { tandaiError(formDaftar.ulang, "Konfirmasi password tidak sama"); ok = false; }
    if (!ok) return;

    const baru = ambil("penggunaBaru", []);
    baru.push({ id: dataPengguna.length + baru.length + 1, nama, email, password: pass, role: "User" });
    simpan("penggunaBaru", baru);
    formDaftar.reset();
    tutupModal("modal-daftar");
    alert("Pendaftaran berhasil! Silakan login dengan akun Anda.");
    form.email.value = email;
    form.password.focus();
  });

  // Modal: Lupa password
  const formLupa = $("#form-lupa");
  formLupa.addEventListener("submit", e => {
    e.preventDefault();
    bersihkanError(formLupa);
    const email = formLupa.email.value.trim();
    if (!polaEmail.test(email)) { tandaiError(formLupa.email, "Masukkan email yang valid"); return; }
    const user = ambilPengguna().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) { tandaiError(formLupa.email, "Email tidak ditemukan"); return; }
    formLupa.reset();
    tutupModal("modal-lupa");
    alert("Tautan reset password (simulasi) telah dikirim ke " + user.email);
  });
}

/* =========================================================
   3. DASHBOARD (dashboard.html)
   ========================================================= */
function sapaanWaktu() {
  const jam = new Date().getHours();
  if (jam >= 4 && jam < 11) return "Selamat pagi";
  if (jam >= 11 && jam < 15) return "Selamat siang";
  if (jam >= 15 && jam < 18) return "Selamat sore";
  return "Selamat malam";
}

function initDashboard() {
  const user = cekLogin();
  if (!user) return;
  pasangModal();

  // Greeting berdasarkan waktu lokal
  $("#greeting").textContent = `${sapaanWaktu()}, ${user.nama}!`;
  $("#peran-user").textContent = user.role || "User";
  const jam = $("#jam-lokal");
  const tampilJam = () => {
    jam.textContent = new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" });
  };
  tampilJam();
  setInterval(tampilJam, 1000);

  const katalog = ambilKatalog();
  const transaksi = Object.values(semuaTracking());

  // Ringkasan angka
  $("#sum-judul").textContent = katalog.length;
  $("#sum-stok").textContent = katalog.reduce((a, b) => a + b.stok, 0);
  $("#sum-pesanan").textContent = transaksi.length;

  // Modal Laporan Pemesanan: rekap per ekspedisi
  const rekap = {};
  transaksi.forEach(t => {
    rekap[t.ekspedisi] = rekap[t.ekspedisi] || { jumlah: 0, total: 0 };
    rekap[t.ekspedisi].jumlah++;
    rekap[t.ekspedisi].total += parseRupiah(t.total);
  });
  const tbLaporan = $("#tbody-laporan");
  tbLaporan.innerHTML = "";
  Object.keys(rekap).forEach(k => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHTML(k)}</td><td>${rekap[k].jumlah}</td><td>${formatRupiah(rekap[k].total)}</td>`;
    tbLaporan.appendChild(tr);
  });
  $("#total-laporan").textContent = formatRupiah(transaksi.reduce((a, b) => a + parseRupiah(b.total), 0));

  // Modal History Transaksi
  const tbRiwayat = $("#tbody-riwayat");
  tbRiwayat.innerHTML = "";
  transaksi.forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHTML(t.nomorDO)}</td><td>${escapeHTML(t.tanggalKirim)}</td><td>${escapeHTML(t.nama)}</td>
      <td>${escapeHTML(t.ekspedisi)}</td><td>${escapeHTML(t.paket)}</td><td>${escapeHTML(t.total)}</td>
      <td><span class="badge badge-info">${escapeHTML(t.status)}</span></td>`;
    tbRiwayat.appendChild(tr);
  });
}

/* =========================================================
   4. STOK / KATALOG (stok.html)
   ========================================================= */
function initStok() {
  cekLogin();
  pasangModal();
  let katalog = ambilKatalog();
  const tbody = $("#tbody-stok");
  const cari = $("#cari-buku");
  const filter = $("#filter-kategori");

  function tambahOpsiJenis(j) {
    if ([...filter.options].some(o => o.value === j)) return;
    const o = document.createElement("option");
    o.value = j; o.textContent = j;
    filter.appendChild(o);
  }
  katalog.forEach(b => tambahOpsiJenis(b.jenisBarang));

  function render() {
    const kata = cari.value.trim().toLowerCase();
    const jenis = filter.value;
    tbody.innerHTML = "";
    const hasil = katalog.filter(b =>
      (jenis === "" || b.jenisBarang === jenis) &&
      (b.namaBarang.toLowerCase().includes(kata) || b.kodeBarang.toLowerCase().includes(kata)));
    if (hasil.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty">Buku tidak ditemukan.</td></tr>';
    }
    hasil.forEach(b => {
      const tr = document.createElement("tr");
      const tdGambar = document.createElement("td");
      tdGambar.appendChild(buatGambar(b));
      tr.appendChild(tdGambar);
      tr.insertAdjacentHTML("beforeend", `
        <td>${escapeHTML(b.kodeBarang)}</td><td>${escapeHTML(b.namaBarang)}</td><td>${escapeHTML(b.jenisBarang)}</td>
        <td>${escapeHTML(b.edisi)}</td><td>${escapeHTML(b.harga)}</td>
        <td><span class="badge ${b.stok <= 50 ? "badge-low" : "badge-ok"}">${b.stok}${b.stok <= 50 ? " (menipis)" : ""}</span></td>
        <td><button class="btn btn-danger btn-sm" data-hapus="${escapeHTML(b.kodeBarang)}">Hapus</button></td>`);
      tbody.appendChild(tr);
    });
    $("#jumlah-judul").textContent = katalog.length;
  }

  cari.addEventListener("input", render);
  filter.addEventListener("change", render);

  // Hapus baris (event delegation)
  tbody.addEventListener("click", e => {
    const kode = e.target.dataset.hapus;
    if (!kode) return;
    if (confirm("Hapus buku " + kode + " dari katalog?")) {
      katalog = katalog.filter(b => b.kodeBarang !== kode);
      simpan("katalogV2", katalog);
      render();
      toast("Buku " + kode + " dihapus", "success");
    }
  });

  // Tambah stok baru (manipulasi DOM)
  const form = $("#form-tambah");
  form.addEventListener("submit", e => {
    e.preventDefault();
    bersihkanError(form);
    const kode = form.kode.value.trim().toUpperCase();
    const nama = form.nama.value.trim();
    const jenis = form.jenis.value.trim();
    const edisi = form.edisi.value.trim();
    const harga = Number(form.harga.value);
    const stok = Number(form.stok.value);
    let ok = true;
    if (!/^[A-Z]{4}\d{4}$/.test(kode)) { tandaiError(form.kode, "Format kode: 4 huruf + 4 angka (mis. EKMA4999)"); ok = false; }
    else if (katalog.some(b => b.kodeBarang === kode)) { tandaiError(form.kode, "Kode sudah dipakai"); ok = false; }
    if (nama.length < 3) { tandaiError(form.nama, "Nama minimal 3 karakter"); ok = false; }
    if (!jenis) { tandaiError(form.jenis, "Jenis barang wajib diisi"); ok = false; }
    if (!/^[1-9]\d*$/.test(edisi)) { tandaiError(form.edisi, "Edisi harus angka (1, 2, 3, ...)"); ok = false; }
    if (!(harga > 0)) { tandaiError(form.harga, "Harga harus lebih dari 0"); ok = false; }
    if (!Number.isInteger(stok) || stok < 0) { tandaiError(form.stok, "Stok harus bilangan bulat >= 0"); ok = false; }
    if (!ok) { toast("Periksa kembali isian form", "error"); return; }

    katalog.push({
      kodeBarang: kode, namaBarang: nama, jenisBarang: jenis, edisi, stok,
      harga: formatRupiah(harga), cover: "img/" + kode.toLowerCase() + ".jpg"
    });
    simpan("katalogV2", katalog);
    tambahOpsiJenis(jenis);
    form.reset();
    tutupModal("modal-tambah");
    render();
    toast("Stok baru berhasil ditambahkan", "success");
  });

  $("#btn-reset-data").addEventListener("click", () => {
    if (confirm("Kembalikan katalog ke data awal?")) {
      localStorage.removeItem("katalogV2");
      katalog = ambilKatalog();
      render();
      toast("Katalog dikembalikan ke data awal");
    }
  });

  render();
}

/* =========================================================
   5. PEMESANAN (checkout.html)
   ========================================================= */
function initCheckout() {
  const user = cekLogin();
  pasangModal();
  const katalog = ambilKatalog();
  let keranjang = ambil("keranjangV2", []);

  const pilih = $("#pilih-buku");
  katalog.forEach(b => {
    const o = document.createElement("option");
    o.value = b.kodeBarang;
    o.textContent = `${b.namaBarang} (Edisi ${b.edisi}) - ${b.harga} | stok ${b.stok}`;
    pilih.appendChild(o);
  });

  function renderKeranjang() {
    const tbody = $("#tbody-keranjang");
    tbody.innerHTML = "";
    if (keranjang.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Keranjang masih kosong. Tambahkan buku di atas.</td></tr>';
    }
    keranjang.forEach((it, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHTML(it.nama)}</td><td>${formatRupiah(it.harga)}</td>
        <td><input type="number" class="cart-qty" min="1" max="${it.maks}" value="${it.qty}" data-ubah="${idx}" aria-label="Jumlah ${escapeHTML(it.nama)}"></td>
        <td>${formatRupiah(it.harga * it.qty)}</td>
        <td><button class="btn btn-danger btn-sm" data-hapus="${idx}">Hapus</button></td>`;
      tbody.appendChild(tr);
    });
    const total = keranjang.reduce((a, b) => a + b.harga * b.qty, 0);
    $("#total-bayar").textContent = formatRupiah(total);
    simpan("keranjangV2", keranjang);
  }

  $("#btn-tambah-item").addEventListener("click", () => {
    const err = $("#err-buku");
    err.textContent = "";
    const kode = pilih.value;
    const qty = Number($("#qty-buku").value);
    if (!kode) { err.textContent = "Pilih buku terlebih dahulu"; return; }
    if (!Number.isInteger(qty) || qty < 1) { err.textContent = "Jumlah minimal 1"; return; }
    const buku = katalog.find(b => b.kodeBarang === kode);
    const ada = keranjang.find(k => k.kode === kode);
    const totalQty = (ada ? ada.qty : 0) + qty;
    if (totalQty > buku.stok) { err.textContent = `Stok tidak cukup (tersedia ${buku.stok})`; return; }
    if (ada) ada.qty = totalQty;
    else keranjang.push({ kode, nama: buku.namaBarang, harga: parseRupiah(buku.harga), qty, maks: buku.stok });
    renderKeranjang();
    toast("Ditambahkan ke keranjang", "success");
  });

  const tbody = $("#tbody-keranjang");
  tbody.addEventListener("click", e => {
    if (e.target.dataset.hapus !== undefined) {
      keranjang.splice(Number(e.target.dataset.hapus), 1);
      renderKeranjang();
    }
  });
  tbody.addEventListener("change", e => {
    if (e.target.dataset.ubah === undefined) return;
    const it = keranjang[Number(e.target.dataset.ubah)];
    let v = Number(e.target.value);
    if (!Number.isInteger(v) || v < 1) v = 1;
    if (v > it.maks) { v = it.maks; toast("Jumlah dibatasi sesuai stok (" + it.maks + ")", "error"); }
    it.qty = v;
    renderKeranjang();
  });

  // Isi otomatis nama & email dari akun login
  const form = $("#form-pesan");
  if (user) { form.nama.value = user.nama; form.email.value = user.email; }

  // Kolom nomor rekening hanya muncul untuk transfer bank
  const kotakKartu = $("#kotak-kartu");
  form.pembayaran.addEventListener("change", () => {
    kotakKartu.style.display = form.pembayaran.value === "Transfer Bank" ? "block" : "none";
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    bersihkanError(form);
    let ok = true;
    const nama = form.nama.value.trim();
    const email = form.email.value.trim();
    const telp = form.telepon.value.trim();
    const alamat = form.alamat.value.trim();
    if (nama.length < 3) { tandaiError(form.nama, "Nama minimal 3 karakter"); ok = false; }
    if (!polaEmail.test(email)) { tandaiError(form.email, "Email tidak valid"); ok = false; }
    if (!/^(\+62|62|0)8\d{7,12}$/.test(telp)) { tandaiError(form.telepon, "Nomor HP tidak valid (mis. 081234567890)"); ok = false; }
    if (alamat.length < 10) { tandaiError(form.alamat, "Alamat minimal 10 karakter"); ok = false; }
    if (!form.ekspedisi.value) { tandaiError(form.ekspedisi, "Pilih ekspedisi"); ok = false; }
    if (!form.pembayaran.value) { tandaiError(form.pembayaran, "Pilih metode pembayaran"); ok = false; }
    if (form.pembayaran.value === "Transfer Bank" && !/^\d{10,16}$/.test(form.rekening.value.trim())) {
      tandaiError(form.rekening, "Nomor rekening 10-16 digit angka"); ok = false;
    }
    if (keranjang.length === 0) { $("#err-buku").textContent = "Keranjang masih kosong"; ok = false; }
    if (!ok) { toast("Data pemesanan belum lengkap", "error"); return; }

    const semua = ambilPesananBaru();
    const nomorDO = String(new Date().getFullYear()) + String(14 + semua.length).padStart(4, "0");
    const total = keranjang.reduce((a, b) => a + b.harga * b.qty, 0);
    const jumlahItem = keranjang.reduce((a, b) => a + b.qty, 0);
    const sekarang = new Date();
    const tgl = sekarang.toISOString().slice(0, 10);
    const waktu = tgl + " " + sekarang.toTimeString().slice(0, 8);
    // Bentuk record sama dengan dataTracking dari dosen, ditambah data pemesan
    semua.push({
      nomorDO, nama, status: "Pesanan Dibuat", ekspedisi: form.ekspedisi.value,
      tanggalKirim: tgl, paket: `Paket Buku (${jumlahItem} item)`, total: formatRupiah(total),
      perjalanan: [{ waktu, keterangan: "Pesanan dibuat dan menunggu pengemasan. Pemesan: " + nama }],
      email, telepon: telp, alamat, pembayaran: form.pembayaran.value
    });
    simpan("pesananV2", semua);

    // kurangi stok pada katalog
    const kat = ambilKatalog();
    keranjang.forEach(k => { const b = kat.find(x => x.kodeBarang === k.kode); if (b) b.stok -= k.qty; });
    simpan("katalogV2", kat);

    keranjang = [];
    renderKeranjang();
    form.reset();
    $("#ringkas-do").textContent = nomorDO;
    $("#ringkas-total").textContent = formatRupiah(total);
    bukaModal("modal-sukses");
  });

  renderKeranjang();
}

/* =========================================================
   6. TRACKING (tracking.html)
   ========================================================= */
function initTracking() {
  cekLogin();
  const form = $("#form-tracking");
  const hasil = $("#hasil-tracking");

  form.addEventListener("submit", e => {
    e.preventDefault();
    bersihkanError(form);
    hasil.innerHTML = "";
    const no = form.nomor.value.trim();
    if (!no) { tandaiError(form.nomor, "Nomor Delivery Order wajib diisi"); return; }
    if (!/^\d+$/.test(no)) { tandaiError(form.nomor, "Nomor DO hanya berisi angka"); return; }
    const d = semuaTracking()[no];
    if (!d) {
      hasil.innerHTML = `<div class="alert alert-error show">Nomor DO <strong>${escapeHTML(no)}</strong> tidak ditemukan. Coba: 20230012 atau 20230013.</div>`;
      return;
    }
    let idx = tahapPengiriman.indexOf(d.status);
    if (idx < 0) idx = 0;
    const persen = (idx / (tahapPengiriman.length - 1)) * 88; // lebar garis progres
    const stepHTML = tahapPengiriman.map((t, i) => {
      const kls = i < idx ? "done" : (i === idx ? "current" : "");
      return `<div class="step ${kls}"><div class="dot">${i < idx ? "&#10003;" : i + 1}</div>${t}</div>`;
    }).join("");
    const perjalananHTML = (d.perjalanan || []).map(p =>
      `<li><time>${escapeHTML(p.waktu)}</time>${escapeHTML(p.keterangan)}</li>`).join("");
    hasil.innerHTML = `
      <div class="card">
        <h2>Hasil Pelacakan: ${escapeHTML(d.nomorDO)}</h2>
        <p>Status saat ini: <span class="badge badge-info">${escapeHTML(d.status)}</span></p>
        <div class="progress"><div class="progress-fill" style="width:0%" data-lebar="${persen}%"></div>${stepHTML}</div>
        <dl class="detail-list">
          <dt>Nama Pemesan</dt><dd>${escapeHTML(d.nama)}</dd>
          <dt>Ekspedisi</dt><dd>${escapeHTML(d.ekspedisi)}</dd>
          <dt>Tanggal Kirim</dt><dd>${escapeHTML(d.tanggalKirim)}</dd>
          <dt>Jenis Paket</dt><dd>${escapeHTML(d.paket)}</dd>
          <dt>Total Pembayaran</dt><dd>${escapeHTML(d.total)}</dd>
        </dl>
      </div>
      <div class="card">
        <h2>Riwayat Perjalanan Paket</h2>
        <ul class="timeline">${perjalananHTML}</ul>
      </div>`;
    // animasi progress bar
    setTimeout(() => {
      const fill = $(".progress-fill", hasil);
      if (fill) fill.style.width = fill.dataset.lebar;
    }, 60);
  });
}

/* =========================================================
   7. ROUTER SEDERHANA
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const halaman = document.body.dataset.page;
  const peta = { login: initLogin, dashboard: initDashboard, stok: initStok, checkout: initCheckout, tracking: initTracking };
  if (peta[halaman]) peta[halaman]();
});