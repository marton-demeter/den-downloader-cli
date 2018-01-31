const fs = require('fs');
const pad = require('pad-md');
const request = require('request');
const rp = require('request-promise');

downloadVideo = (init_url,path) => {
  if(!init_url) return;
  return new Promise((resolve, reject) => {
    try {
      var init_url_prefix = init_url.split('/playlist')[0];
      var file_name_parts = init_url.split('/')[6].split('_');
      var file_name = `${file_name_parts[0]}_${file_name_parts[1].slice(-8)}`;
    } catch(error) { return }
    rp(init_url).then(async (body) => {
      return await rp(`${init_url_prefix}/${body.split('\n').splice(-2)[0]}`);
    }).then((data) => {
      m3u8_contents = data.split('\n');
      const RETRIES = 3;
      var _d = Function();
      var num_total_segments = (m3u8_contents.length - 6) / 2;
      var queued_processes = 0;
      var retry_counter = 0;
      var video_segment_prefix = `${m3u8_contents[5].split('_ps0_')[0]}_ps0_`
      var writeStream = fs.createWriteStream(path,{autoClose:false});
      (_d = () => {
        var options = {
          uri: `${init_url_prefix}/${video_segment_prefix}${pad.left(queued_processes++,3,'0')}.ts`,
          encoding: null
        };
        request(options).on('data', (data) => {
          writeStream.write(data);
        }).on('end', () => {
          if(queued_processes <= num_total_segments) _d();
          else resolve();
        }).on('error', (error) => {
          if(retry_counter++ < RETRIES) {
            queued_processes = 0;
            _d();
          } else reject(error);
        });
      })();
    }).catch((error) => { reject(error) })
  });
}

module.exports = {
  downloadVideo
}


