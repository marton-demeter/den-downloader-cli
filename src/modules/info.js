const rp = require('request-promise');

_genericGetRequest = (jar,url) => {
  return new Promise((resolve, reject) => {
    rp({
      jar: jar,
      method: 'get',
      gzip: true,
      url: url
    }).then((data) => { resolve(data) }).catch((error) => { reject(error) });
  });
}

requestCoursesHome = async (jar) => {
  var url = 'https://courses.uscden.net/d2l/home';
  return await _genericGetRequest(jar,url);
}

requestCourseList = async (jar,url) => {
  return await _genericGetRequest(jar,url);
}

requestCoursePage = async (jar,url) => {
  return await _genericGetRequest(jar,url);
}

module.exports = {
  requestCoursesHome,
  requestCourseList,
  requestCoursePage
}