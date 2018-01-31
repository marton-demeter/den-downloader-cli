const rp = require('request-promise');
const auth = require('./modules/auth');
const doc = require('./modules/document');
const info = require('./modules/info');
const proc = require('./modules/process');
const video = require('./modules/video');

var jar_c = rp.jar();
var jar_t = rp.jar();

auth.promptCredentials().then(async (cred) => {
  return await auth.authenticateCoursesDen(jar_c,cred);
}).then(async () => {
  return await info.requestCoursesHome(jar_c);
}).then(async (data) => {
  return await proc.getCourseListLink(data);
}).then(async (link) => {
  return await info.requestCourseList(jar_c,link);
}).then(async (data) => {
  return await proc.getCourses(data);
}).then(async (courses) => {
  return await proc.promptCourseSelection(courses);
}).then(async (course) => {
  return await info.requestCoursePage(jar_c,course.url);
}).then(async (data) => {
  return await proc.parseCourseContent(data);
}).then(async (content) => {
  return await proc.categorizeCourseContent(jar_c,jar_t,content);
}).then(async (content) => {
  return await proc.promptContentTypeSelection(content);
}).then(async (content) => {
  return await proc.promptContentSelection(content);
}).then((content) => {
  return proc.downloadContent(jar_c,jar_t,content);
}).catch((error) => { console.log(error.message); process.exit(1) });