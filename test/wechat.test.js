require('should');

var querystring = require('querystring');
var request = require('supertest');
var support = require('./support');
var template = require('./support').template2;
var tail = require('./support').tail;
var postData = require('./support').postData;

var cfg = require('./config');
var WXBizMsgCrypt = require('wechat-crypto');

var wechat = require('../');
var app = require('koa')();
var config = {
  encodingAESKey: cfg.encodingAESKey,
  token: cfg.token,
  corpId: cfg.corpid
};

app.use(wechat(config).middleware(function*() {
  // 微信输入信息都在this.weixin上
  var info = this.weixin;
  // console.log('wx message:', info);
  if (info.MsgType === 'text') {
    if (info.FromUserName === 'diaosi') {
      // Reply different types of message
      if (info.Content === 'reply_music') {
        this.body = {
          title: '来段音乐吧',
          description: '一无所有',
          musicUrl: 'http://mp3.com/xx.mp3?a=b&c=d',
          hqMusicUrl: 'http://mp3.com/xx.mp3?foo=bar'
        };
      } else if (info.Content === 'reply_news') {
        this.body = [{
          title: '你来我家接我吧',
          description: '这是女神与高富帅之间的对话',
          picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
          url: 'http://nodeapi.cloudfoundry.com/'
        }];
      } else if (info.Content === 'reply_text') {
        this.body = 'hehe';
      } else {
        this.body = 'hehe';
      }
    } else {
      // 回复高富帅(图文回复)
      this.body = [{
        title: '你来我家接我吧',
        description: '这是女神与高富帅之间的对话',
        picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
        url: 'http://nodeapi.cloudfoundry.com/'
      }];
    }
  } else if (info.MsgType) {
    this.body = info.MsgType;
  } else {
    this.body = 'hehe';
  }
}));

app = app.callback();
describe('wechat.js', function() {
  var cryptor = new WXBizMsgCrypt(cfg.token, cfg.encodingAESKey, cfg.corpid);

  describe('GET Method', function() {
    it('should ok', function(done) {
      var echoStr = 'node rock';
      var _tail = tail(cfg.token, cryptor.encrypt(echoStr), true);
      request(app)
        .get('/wechat?' + _tail)
        .expect(200)
        .expect(echoStr, done);
    });

    it('should 401', function(done) {
      request(app)
        .get('/wechat')
        .expect(401)
        .expect('Invalid signature', done);
    });

    it('should not ok', function(done) {
      var echoStr = 'node rock';
      var _tail = tail('fake_token', cryptor.encrypt(echoStr), true);
      request(app)
        .get('/wechat?' + _tail)
        .expect(401)
        .expect('Invalid signature', done);
    });

    it('should 401 invalid signature', function(done) {
      var q = {
        timestamp: new Date().getTime(),
        nonce: parseInt((Math.random() * 10e10), 10)
      };
      q.signature = 'invalid_signature';
      q.echostr = 'hehe';
      request(app)
        .get('/wechat?' + querystring.stringify(q))
        .expect(401)
        .expect('Invalid signature', done);
    });
  });

  describe('POST Method', function() {
    // it('should 500', function (done) {
    //   request(app)
    //   .post('/wechat')
    //   .expect(500)
    //   .expect(/body is empty/, done);
    // });

    it('should 401 invalid signature', function(done) {
      var xml = '<xml></xml>';
      var data = postData('fake_token', cryptor.encrypt(xml));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(401)
        .expect('Invalid signature', done);
    });

    it('should 200', function(done) {
      var xml = '<xml></xml>';
      var data = postData(cfg.token, cryptor.encrypt(xml));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200, done);
    });
  });

  describe('Recieve Message', function() {
    it('should ok with text', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: '测试中'
      };
      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[text]]></MsgType>');
            message.should.include('<Content><![CDATA[hehe]]></Content>');
            done();
          });
        });
    });

    it('should ok when image', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'image',
        pic: 'http://mmsns.qpic.cn/mmsns/bfc815ygvIWcaaZlEXJV7NzhmA3Y2fc4eBOxLjpPI60Q1Q6ibYicwg/0'
      };
      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[text]]></MsgType>');
            message.should.include('<Content><![CDATA[image]]></Content>');
            done();
          });
        });
    });

    it('should ok when location', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'location',
        xPos: 'xPos',
        yPos: 'yPos',
        scale: '100',
        label: 'label'
      };

      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[text]]></MsgType>');
            message.should.include('<Content><![CDATA[location]]></Content>');
            done();
          });
        });
    });

    it('should ok when voice', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'voice',
        mediaId: 'id',
        format: 'format'
      };

      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[text]]></MsgType>');
            message.should.include('<Content><![CDATA[voice]]></Content>');
            done();
          });
        });
    });

    it('should ok when link', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'link',
        title: 'good link',
        description: '1024',
        url: 'http://where.is.caoliu/'
      };

      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[text]]></MsgType>');
            message.should.include('<Content><![CDATA[link]]></Content>');
            done();
          });
        });
    });

    it('should ok when event location', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'event',
        event: 'LOCATION',
        latitude: '23.137466',
        longitude: '113.352425',
        precision: '119.385040'
      };

      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[text]]></MsgType>');
            message.should.include('<Content><![CDATA[event]]></Content>');
            done();
          });
        });
    });

    it('should ok when event enter', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'event',
        event: 'ENTER'
      };

      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[text]]></MsgType>');
            message.should.include('<Content><![CDATA[event]]></Content>');
            done();
          });
        });
    });
  });

  describe('Reply Message', function() {
    it('should ok reply text', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: 'reply_text'
      };
      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[diaosi]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[text]]></MsgType>');
            message.should.include('<Content><![CDATA[hehe]]></Content>');
            done();
          });
        });
    });

    it('should ok reply news', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'gaofushuai',
        type: 'text',
        text: 'reply_news'
      };
      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<ToUserName><![CDATA[gaofushuai]]></ToUserName>');
            message.should.include('<FromUserName><![CDATA[nvshen]]></FromUserName>');
            message.should.match(/<CreateTime>\d{13}<\/CreateTime>/);
            message.should.include('<MsgType><![CDATA[news]]></MsgType>');
            message.should.include('<ArticleCount>1</ArticleCount>');
            message.should.include('<Title><![CDATA[你来我家接我吧]]></Title>');
            message.should.include('<Description><![CDATA[这是女神与高富帅之间的对话]]></Description>');
            message.should.include('<PicUrl><![CDATA[http://nodeapi.cloudfoundry.com/qrcode.jpg]]></PicUrl>');
            message.should.include('<Url><![CDATA[http://nodeapi.cloudfoundry.com/]]></Url>');
            done();
          });
        });
    });

    it('should ok reply music', function(done) {
      var info = {
        sp: 'nvshen',
        user: 'diaosi',
        type: 'text',
        text: 'reply_music'
      };

      var data = postData(cfg.token, cryptor.encrypt(template(info)));
      request(app)
        .post('/wechat?' + data.querystring)
        .send(data.xml)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          var body = res.text.toString();
          support.parse(body, function(err, result) {
            var message = cryptor.decrypt(result.Encrypt).message;
            message.should.include('<MsgType><![CDATA[music]]></MsgType>');
            message.should.include('<Title><![CDATA[来段音乐吧]]></Title>');
            message.should.include('<Description><![CDATA[一无所有]]></Description>');
            message.should.include('<MusicUrl><![CDATA[http://mp3.com/xx.mp3?a=b&c=d]]></MusicUrl>');
            message.should.include('<HQMusicUrl><![CDATA[http://mp3.com/xx.mp3?foo=bar]]></HQMusicUrl>');
            done();
          });
        });
    });
  });
});