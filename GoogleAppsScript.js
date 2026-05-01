function doPost(e) {
  try {
    var ss;
    var sheetID = "1K3ISAk-bpZv8csZyNy-H4Gl5XIVkmDJvHSJD1Wd2wo4";
    
    try {
      ss = SpreadsheetApp.openById(sheetID);
    } catch(err) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    if (!ss) throw new Error("Could not find Spreadsheet. Please check ID.");

    // Get Product sheet: try by name first, then by index 0
    var sheetProducts = ss.getSheetByName("Product List") || ss.getSheets()[0];
    var sheetOrders = ss.getSheetByName("Orders");

    if (!sheetOrders) {
      sheetOrders = ss.insertSheet("Orders");
      sheetOrders.appendRow(["วันที่-เวลา", "ชื่อลูกค้า", "เบอร์โทร", "ที่อยู่", "ลิงก์แผนที่", "รายการสินค้า", "ยอดรวม", "ลิงก์สลิป", "สถานะ"]);
    }

    var contents;
    try {
      contents = JSON.parse(e.postData.contents);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Invalid JSON" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var action = contents.action || "log";

    // --- CASE 1: Log new order ---
    if (action === "log") {
      sheetOrders.insertRowAfter(1);
      var newRow = [
        new Date(),
        contents.name,
        "'" + contents.phone,
        contents.address,
        contents.mapUrl,
        contents.items,
        contents.total,
        contents.slipUrl,
        "รอดำเนินการ"
      ];
      sheetOrders.getRange(2, 1, 1, newRow.length).setValues([newRow]);

      // ตัดสต็อกสินค้า
      if (contents.itemsArray) {
        var products = sheetProducts.getDataRange().getValues();
        contents.itemsArray.forEach(function(item) {
          for (var i = 1; i < products.length; i++) {
            if (products[i][0].toString().trim() == item.name.toString().trim() && products[i][1].toString().trim() == item.size.toString().trim()) {
              var currentStock = parseInt(products[i][7]) || 0;
              var currentSold = parseInt(products[i][8]) || 0;
              var newStock = currentStock - item.qty;
              var newSold = currentSold + item.qty;
              sheetProducts.getRange(i + 1, 8).setValue(newStock);
              sheetProducts.getRange(i + 1, 9).setValue(newSold);
              
              if (newStock <= 0) {
                sheetProducts.getRange(i + 1, 7).setValue("หมด");
              }
              break;
            }
          }
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- CASE 3: Add new product ---
    if (action === "addProduct") {
      sheetProducts.appendRow([
        contents.name, contents.size, contents.price, contents.note, contents.image, 
        contents.tags, contents.status || "มีของ", contents.stock || 0, contents.sold_count || 0, contents.category || ""
      ]);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- CASE 4: Update product ---
    if (action === "updateProduct") {
      var data = sheetProducts.getDataRange().getValues();
      var oldName = contents.oldName ? contents.oldName.toString().trim() : "";
      var oldSize = contents.oldSize ? contents.oldSize.toString().trim() : "";

      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim() == oldName && data[i][1].toString().trim() == oldSize) {
          sheetProducts.getRange(i + 1, 1, 1, 10).setValues([[
            contents.name, contents.size, contents.price, contents.note, contents.image,
            contents.tags, contents.status, contents.stock, contents.sold_count, contents.category
          ]]);
          return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "result": "not found" })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- CASE 5: Delete product ---
    if (action === "deleteProduct") {
      var data = sheetProducts.getDataRange().getValues();
      var targetName = contents.name ? contents.name.toString().trim() : "";
      var targetSize = contents.size ? contents.size.toString().trim() : "";
      
      for (var i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim() == targetName && data[i][1].toString().trim() == targetSize) {
          sheetProducts.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

  } catch (f) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": f.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
