const fs = require('fs');
const moment = require('moment');

generateOutputDirectory = (path) => {
  try {
    path = path || `content_${moment().unix()}`;
    fs.mkdirSync(path);
    fs.mkdirSync(`${path}/documents`);
    fs.mkdirSync(`${path}/videos`);
  } catch(error) {}
  return path;
}

module.exports = {
  generateOutputDirectory
}