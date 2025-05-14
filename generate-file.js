const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Header kolom sesuai permintaan
const headers = [
  "no", "kdsatker", "kdanak", "kdsubanak", "bulan", "tahun", "nogaji",
  "kdjns", "nip", "nmpeg", "kdduduk", "kdgol", "npwp", "nmrek", "nm_bank",
  "rekening", "kdbankspan", "nmbankspan", "kdpos", "kdnegara", "kdkppn",
  "tipesup", "gjpokok", "tjistri", "tjanak", "tjupns", "tjstruk", "tjfungs",
  "tjdaerah", "tjpencil", "tjlain", "tjkompen", "pembul", "tjberas", "tjpph",
  "potpfkbul", "potpfk2", "potpfk10", "potpph", "potswrum", "potkelbtj",
  "potlain", "pottabrum", "bersih", "sandi", "kdkawin", "kdjab", "thngj"
];

// Data yang bernilai statis (kecuali field "nip", "nmpeg", dan "nmrek" yang akan diubah per file)
const rowStatic = [
  "1",           // no
  "999999",      // kdsatker
  "02",          // kdanak
  "01",          // kdsubanak
  "05",          // bulan
  "2025",        // tahun
  "001510",      // nogaji
  "1",           // kdjns
  "",            // nip (dinamis)
  "",            // nmpeg (dinamis)
  "01",          // kdduduk
  "31",          // kdgol
  "658046784033906", // npwp
  "",            // nmrek (dinamis, sama dengan nmpeg)
  "BANK BSI",    // nm_bank
  "10-608-16863BQ", // rekening
  "525451000990",   // kdbankspan
  "BANK BSI",    // nmbankspan
  "40113",       // kdpos
  "ID",          // kdnegara
  "095",         // kdkppn
  "03",          // tipesup
  "3607500",     // gjpokok
  "0",           // tjistri
  "0",           // tjanak
  "185000",      // tjupns
  "0",           // tjstruk
  "0",           // tjfungs
  "0",           // tjdaerah
  "0",           // tjpencil
  "0",           // tjlain
  "35",          // tjkompen
  "72420",       // pembul
  "0",           // tjberas
  "0",           // tjpph
  "0",           // potpfkbul
  "351455",      // potpfk2
  "0",           // potpfk10
  "0",           // potpph
  "0",           // potswrum
  "0",           // potkelbtj
  "0",           // potlain
  "3441045",     // pottabrum
  "0082840C",    // bersih
  "1000",        // sandi
  "99999",       // kdkawin
  "2025",        // kdjab
  "2025"         // thngj
];

/**
 * Fungsi untuk membuat file Excel dengan data yang sudah di-generate
 *
 * @param {string} folderName - nama folder tempat file akan disimpan
 * @param {number} seq - nomor urut untuk menentukan nilai dinamis (nip, nmpeg, nmrek)
 */
// function generateExcelFile(folderName, seq) {
//   // Untuk "nip": sample file pertama berisi "222222222222222100", file kedua "222222222222222101", dst.
//   // Kita mulai dengan angka 100 dan bertambah setiap file.
//   const baseNumber = 100;
//   const currentNumber = baseNumber + seq - 1;
//   // Membentuk string 'nip'. Misalnya: "222222222222222100"
//   const nip = "222222222222222" + currentNumber;
//   // Untuk nama pegawai, gunakan "TEST <nomorFile>"
//   const nmpeg = "TEST " + seq;
//   // Misalnya kita juga set "nmrek" sama dengan nmpeg
//   const nmrek = nmpeg;

//   // Clone array statis agar tidak mengubah aslinya dan set nilai dinamis
//   const row = [...rowStatic];
//   row[8]  = nip;    // field nip
//   row[9]  = nmpeg;  // field nmpeg
//   row[13] = nmrek;  // field nmrek

//   // Buat data array-of-array (AOA): header di baris pertama, row data di baris kedua
//   const data = [headers, row];

//   // Ubah AOA menjadi worksheet
//   const worksheet = XLSX.utils.aoa_to_sheet(data);
//   // Buat workbook baru, lalu tambahkan worksheet-nya
//   const workbook = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

//   // Tentukan path file Excel (dalam folder yang sudah dibuat)
//   const filePath = path.join(folderName, "test.xlsx");
//   XLSX.writeFile(workbook, filePath);
//   console.log(`File Excel berhasil dibuat: ${filePath}`);
// }
  function generateExcelFile(folderName, seq) {
    const baseNumber = 100;
    const data = [headers]; // Awali dengan header di baris pertama

    for (let i = 0; i < 500; i++) {
      const currentNumber = baseNumber + (seq - 1) * 500 + i;
      const nip = "222222222222222" + currentNumber;
      const nmpeg = `TEST ${seq}-${i + 1}`;
      const nmrek = nmpeg;

      const row = [...rowStatic];
      row[8]  = nip;
      row[9]  = nmpeg;
      row[13] = nmrek;

      data.push(row);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const filePath = path.join(folderName, "test.xlsx");
    XLSX.writeFile(workbook, filePath);
    console.log(`File Excel berhasil dibuat: ${filePath}`);
  }


/**
 * Fungsi untuk membuat folder dan file Excel di dalamnya sesuai jumlah yang diinginkan.
 *
 * @param {number} num - jumlah folder yang ingin di-generate
 */
function generateFoldersAndFiles(num) {
  // Dapatkan direktori dasar (misalnya direktori tempat file JS ini berada)
  const baseDir = __dirname;
  for (let i = 1; i <= num; i++) {
    // Nama folder: us1, us2, us3, dsb.
    const folderName = path.join(baseDir,'TESTER', `us${i}`);
    if (!fs.existsSync(folderName)) {
      fs.mkdirSync(folderName);
      console.log(`Folder dibuat: ${folderName}`);
    }
    // Buat file Excel di dalam folder tersebut
    generateExcelFile(folderName, i);
  }
}

// Ambil jumlah folder dari argumen command line jika ada,
// default-nya 3 folder jika tidak ada input.
const numFoldersToCreate = process.argv[2] ? parseInt(process.argv[2]) : 2000;
generateFoldersAndFiles(numFoldersToCreate);
