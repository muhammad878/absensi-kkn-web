// ================================================
// GOOGLE APPS SCRIPT - Absensi KKN Damarjati
// Paste SELURUH kode ini ke Apps Script Anda,
// gantikan semua kode yang ada sebelumnya.
// Lalu klik Deploy > New Deployment lagi.
// ================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    var nama = data.nama;
    var status = data.status;
    var fotoBase64 = data.foto;
    var fileUrl = "-";
    
    // Jika ada foto, simpan ke Google Drive Anda
    if (fotoBase64 && fotoBase64 !== "") {
      try {
        var base64Data = fotoBase64.split(',')[1];
        var blob = Utilities.newBlob(
          Utilities.base64Decode(base64Data),
          "image/jpeg",
          "Absen_" + nama + "_" + new Date().getTime() + ".jpg"
        );
        var file = DriveApp.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
      } catch(fotoError) {
        fileUrl = "Gagal upload foto";
      }
    }
    
    // Masukkan data ke baris baru di Spreadsheet
    sheet.appendRow([new Date(), nama, status, fileUrl]);
    
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "Sukses" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "Error", "pesan": error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi untuk membaca semua data (dipakai Admin Dashboard)
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    
    var results = [];
    // Mulai dari baris ke-2 (baris 1 adalah header)
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      results.push({
        timestamp: row[0],
        nama: row[1],
        status: row[2],
        foto: row[3]
      });
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "OK", "data": results }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "Error", "pesan": error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
