const unique = require('array-unique');
const cheerio = require('cheerio');
const inquirer = require('inquirer');
const rp = require('request-promise');
const doc = require('./document');
const util = require('./util');
const video = require('./video');
var globalIdleSpinner; // lol

getCourseListLink = (data) => {
  return new Promise((resolve, reject) => {
    try {
      $ = cheerio.load(data);
      var link = $('.vui-link.d2l-link').map(function(i,e){
        return $(this).attr('href');
      });
      link = link['4'].split('?')[0]
    } catch(error) { reject(error) }
    resolve(`https://courses.uscden.net${link}`);
  });
}

getCourses = (data) => {
  return new Promise((resolve, reject) => {
    try {
      var courses_id = Array();
      var courses_title = Array();
      $ = cheerio.load(data);
      $('.d2l-datalist-item').find('a').each((i,e) => {
        var id = new RegExp('courseId=.+?$');
        var title = new RegExp('CSCI.+?$');
        if(e.attribs.href) var found_id = e.attribs.href.match(id);
        if(found_id) courses_id.push(found_id[0].slice('courseId='.length));
        if(e.attribs.title) var found_title = e.attribs.title.match(title);
        if(found_title) courses_title.push(found_title[0]);
      });
      unique(courses_id);
      unique(courses_title);
      courses_title = courses_title.map((e) => { 
        e = e.split(' - ');
        return {id:e[0],term:e[1],title:e[2]}
      });
      var courses = courses_id.map((e,i) => { 
        courses_title[i].serial = e;
        courses_title[i].url = `https://courses.uscden.net/d2l/le/content/${e}/Home?itemIdentifier=toc`;
        return courses_title[i];
      });
    } catch(error) { reject(error) }
    resolve(courses);
  });
}

parseCourseContent = (data) => {
  return new Promise((resolve, reject) => {
    try {
      var content = Array();
      $ = cheerio.load(data);
      $('.d2l-datalist-item').find('a').each((i,e) => {
        var link = $(e).attr('href');
        if(link && link.includes('View')) {
          content.push({
            title:$(e).attr('title').split(`' - `)[0].replace(`'`,``),
            type:$(e).attr('title').split(`' - `)[1],
            url:`https://courses.uscden.net${link}`
          });
        }
      });
    } catch(error) { reject(error) }
    resolve(content);
  });
}

categorizeCourseContent = (jar_c,jar_t,c) => {
  return new Promise((resolve, reject) => {
    var content = Object();
    content.document = Array();
    content.video = Array();
    var promises = Array();
    c.forEach((item) => {
      promises.push(new Promise((resolve, reject) => {
        rp({jar:jar_c,method:'get',url:item.url}).then(async (data) => {
          $ = cheerio.load(data);
          var dl = $('.d2l-fileviewer-pdf-pdfjs').attr('data-location');
          if(!dl) {
            var dl = $('.d2l-fileviewer').children().attr('data-location');
            if(dl) dl = `https://courses.uscden.net${dl}`;
          }
          if(dl) {
            item.category = 'document';
            item.download_link = dl;
            content.document.push(item);
            resolve(item);
          } else {
            item.category = 'video';
            await _getVideoLink(jar_c,jar_t,$).then((dl) => {
              if(dl) {
                item.download_link = dl;
                content.video.push(item);
                resolve(item);
              }
              resolve();
            }).catch((error) => {});
          }
          resolve();
        }).catch((error) => {});
      }));
    });
    Promise.all(promises).then(() => { 
      resolve(content);
    }).catch((error) => { reject(error) });
  });
}

promptCourseSelection = (courses) => {
  return new Promise((resolve, reject) => {
    var choices = Array();
    var lookup = Object();
    courses.forEach((course) => {
      var selector = `${course.id} - ${course.title} - ${course.term}`;
      choices.push(selector);
      lookup[selector] = course;
    });
    var question = [{
      type:'list',
      name:'course',
      message:'Select a course.',
      prefix: '',
      suffix: '',
      choices: choices
    }];
    inquirer.prompt(question).then((result) => {
      globalIdleSpinner = new _idleSpinner('Parsing course material');
      globalIdleSpinner.start();
      resolve(lookup[result.course]);
    }).catch((error) => { reject(error) });
  });
}

function _idleSpinner(message) {
  this.states = ['.  ','.. ','...','   '];
  this.s = 0;
  this.speed = 300;
  this.t;
  this.start = () => {
    this.t = setInterval(() => {
      process.stdout.write(`\r ${message}${this.states[(this.s++)%this.states.length]}`);
    }, this.speed);
  }
  this.stop = () => {
    console.log();
    clearInterval(this.t);
  }
}

_getVideoLink = (jar_c,jar_t,$) => {
  return new Promise((resolve, reject) => {
    var vd = $('iframe').attr('src');
    if(vd) {
      vd = `https://courses.uscden.net${vd}`;
      rp({jar:jar_c,method:'get',url:vd}).then((data) => {
        $ = cheerio.load(data);
        var body = Object();
        $('form').find('input').each((i,e) => {
            body[`${$(e).attr('name')}`] = $(e).attr('value');
        });
        return body;
      }).then(async (body) => {
        return await rp({jar:jar_t,method:'post',url:`https://tools.uscden.net/mydentools/students/media/player.php`,formData:body});
      }).then((data) => {
        $ = cheerio.load(data);
        resolve($('.DENVideo').next().attr('href'));
      }).catch((error) => { reject(error) });
    } else reject(new Error('UnsupportedFormat'));
  });
}

promptContentSelection = (obj) => {
  return new Promise((resolve, reject) => {
    var choices = Array();
    var lookup = Object();
    switch(obj.type) {
      case 'document':
        obj.content.document.forEach((item) => {
          var selector = item.title;
          choices.push(selector);
          lookup[selector] = item;
        }); break;
      case 'video':
        obj.content.video.forEach((item) => {
          var selector = item.title;
          choices.push(selector);
          lookup[selector] = item;
        }); break;
      default: 
        var final = Array();
        obj.content.document.forEach((item) => final.push(item));
        obj.content.video.forEach((item) => final.push(item));
        return resolve(final);
    }
    var question = [{
      type: 'checkbox',
      name: 'content',
      message: 'Select what to download.',
      prefix: '',
      suffix: '',
      choices: choices
    }];
    inquirer.prompt(question).then((result) => {
      var final = Array();
      result.content.forEach((item) => {
        final.push(lookup[item]);
      });
      resolve(final);
    }).catch((error) => { reject(error) });
  });
}

promptContentTypeSelection = (content) => {
  return new Promise((resolve, reject) => {
    globalIdleSpinner.stop();
    var question = [{
      type: 'list',
      name: 'content',
      message: 'Select what to download.',
      prefix: '',
      suffix: '',
      choices: ['Documents', 'Video Lectures', 'Everything']
    }];
    inquirer.prompt(question).then((result) => {
      switch(result.content) {
        case 'Documents': resolve({content:content,type:'document'}); break;
        case 'Video Lectures': resolve({content:content,type:'video'}); break;
        case 'Everything': resolve({content:content,type:'everything'}); break;
      }
    }).catch((error) => { reject(error) });
  });
}

downloadContent = (jar_c,jar_t,arr) => {
  var outdir = util.generateOutputDirectory('content');
  arr.forEach((item) => {
    if(item.category === 'document')
      doc.downloadDocument(jar_c,item.download_link,`${outdir}/documents/${item.title}.pdf`);
    if(item.category === 'video') {
      video.downloadVideo(item.download_link,`${outdir}/videos/${item.title.replace(/[\s/]/g,'')}.ts`);
    }
  });
}

module.exports = {
  getCourseListLink,
  getCourses,
  parseCourseContent,
  categorizeCourseContent,
  promptCourseSelection,
  promptContentTypeSelection,
  promptContentSelection,
  downloadContent
}