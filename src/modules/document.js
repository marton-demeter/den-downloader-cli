const fs = require('fs');
const rp = require('request-promise');

saveDocument = (path,data,r) => {
  r = r || 0;
  if(data) {
    fs.writeFile(path,data,'binary',(error)=>{
      if(error && r < 3) saveDocument(path,data,r++);
    });
  }
}

downloadDocument = (jar,url,path) => {
  rp({method:'get',encoding:'binary',jar:jar,url:url
  }).then((data) => {
    console.log(`Download finished ${path}`);
    saveDocument(path,data);
  }).catch((error) => {});
}

module.exports = { 
  saveDocument,
  downloadDocument
}