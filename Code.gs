/**
 * ONE STOP CENTRE UBK SMK BULUH KASAP
 * Google Apps Script backend for live Google Drive synchronisation.
 * Root Drive folder supplied by the user:
 * https://drive.google.com/drive/folders/19zCJH4y9bhmwDXcN6rZEiO--hEkVH0WW
 */
const ROOT_FOLDER_ID = '19zCJH4y9bhmwDXcN6rZEiO--hEkVH0WW';
const MAX_DEPTH = 5;
const MAX_ITEMS = 1200;

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'tree';
    if (action !== 'tree') return output_({ok:false,error:'Unknown action'}, e);
    const data = buildTree_();
    return output_({ok:true,data:data,generatedAt:new Date().toISOString()}, e);
  } catch (err) {
    return output_({ok:false,error:String(err && err.message ? err.message : err)}, e);
  }
}

function output_(obj, e) {
  const callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    // JSONP permits the static site to read this endpoint from GitHub Pages / Netlify.
    const safeCallback = String(callback).replace(/[^A-Za-z0-9_$.]/g, '');
    return ContentService.createTextOutput(safeCallback + '(' + JSON.stringify(obj) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildTree_() {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const counter = {n:0};
  return folderNode_(root, 0, counter);
}

function folderNode_(folder, depth, counter) {
  const node = {
    id: folder.getId(),
    name: folder.getName(),
    type: 'folder',
    url: folder.getUrl(),
    modified: safeDate_(function(){ return folder.getLastUpdated(); }),
    children: []
  };
  if (depth >= MAX_DEPTH || counter.n >= MAX_ITEMS) return node;

  const folders = folder.getFolders();
  while (folders.hasNext() && counter.n < MAX_ITEMS) {
    counter.n++;
    node.children.push(folderNode_(folders.next(), depth + 1, counter));
  }

  const files = folder.getFiles();
  while (files.hasNext() && counter.n < MAX_ITEMS) {
    counter.n++;
    const f = files.next();
    node.children.push({
      id: f.getId(),
      name: f.getName(),
      type: 'file',
      mimeType: f.getMimeType(),
      url: f.getUrl(),
      modified: safeDate_(function(){ return f.getLastUpdated(); }),
      children: []
    });
  }
  node.children.sort(function(a,b){ return naturalCompare_(a.name,b.name); });
  return node;
}

function safeDate_(fn) {
  try { const d = fn(); return d ? d.toISOString() : ''; } catch (e) { return ''; }
}

function naturalCompare_(a,b) {
  return String(a).localeCompare(String(b), 'ms', {numeric:true, sensitivity:'base'});
}
