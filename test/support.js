var querystring = require('querystring');
var xml2js = require('xml2js');

exports.tail = function (token, message, get) {
  var q = {
    timestamp: new Date().getTime(),
    nonce: parseInt((Math.random() * 100000000000), 10)
  };
  if (get) {
    q.echostr = message;
  }
  var s = [token, q.timestamp, q.nonce, message].sort().join('');
  q.msg_signature = require('crypto').createHash('sha1').update(s).digest('hex');
  return querystring.stringify(q);
};

var tpl = '<xml>' +
  '<ToUserName><![CDATA[<%-toUser%>]]></ToUserName>' +
  '<AgentID><![CDATA[<%-toAgentID%>]]></AgentID>' +
  '<Encrypt><![CDATA[<%-msg_encrypt%>]]></Encrypt>' +
'</xml>';

exports.template = require('ejs').compile(tpl);

exports.buildXML = require('ejs').compile('<xml>' +
  '<ToUserName><![CDATA[<%-toUser%>]]></ToUserName>' +
  '<FromUserName><![CDATA[<%-fromUser%>]]></FromUserName>' +
  '<CreateTime><%-new Date().getTime()%></CreateTime>' +
  '<MsgType><![CDATA[text]]></MsgType>' +
  '<Content><![CDATA[<%-content%>]]></Content>' +
  '<MsgId>msgid</MsgId>' +
  '<AgentID>1</AgentID>' +
'</xml>');

var formatMessage = function (result) {
  var message = {};
  if (typeof result === 'object') {
    for (var key in result) {
      if (result[key].length === 1) {
        var val = result[key][0];
        if (typeof val === 'object') {
          message[key] = formatMessage(val);
        } else {
          message[key] = (val || '').trim();
        }
      } else {
        message = result[key].map(formatMessage);
      }
    }
  }
  return message;
};

exports.parse = function (xml, callback) {
  xml2js.parseString(xml, {trim: true}, function (err, result) {
    var xml = formatMessage(result.xml);
    callback(null, xml);
  });
};

exports.postData = function (token, message) {
  var q = {
    timestamp: new Date().getTime(),
    nonce: parseInt((Math.random() * 100000000000), 10)
  };

  var s = [token, q.timestamp, q.nonce, message].sort().join('');
  var signature = require('crypto').createHash('sha1').update(s).digest('hex');
  q.msg_signature = signature;

  var info = {
    msg_encrypt: message,
    toAgentID: 'agentid',
    toUser: 'to_user'
  };

  return {
    xml: exports.template(info),
    querystring: querystring.stringify(q)
  };
};

var tpl2 = [
  '<xml>',
    '<ToUserName><![CDATA[<%=sp%>]]></ToUserName>',
    '<FromUserName><![CDATA[<%=user%>]]></FromUserName>',
    '<CreateTime><%=(new Date().getTime())%></CreateTime>',
    '<MsgType><![CDATA[<%=type%>]]></MsgType>',
    '<% if (type === "text") { %>',
      '<Content><![CDATA[<%=text%>]]></Content>',
    '<% } else if (type === "location") { %>',
      '<Location_X><%=xPos%></Location_X>',
      '<Location_Y><%=yPos%></Location_Y>',
      '<Scale><%=scale%></Scale>',
      '<Label><![CDATA[<%=label%>]]></Label>',
    '<% } else if (type === "image") { %>',
      '<PicUrl><![CDATA[<%=pic%>]]></PicUrl>',
    '<% } else if (type === "voice") { %>',
      '<MediaId><%=mediaId%></MediaId>',
      '<Format><%=format%></Format>',
    '<% } else if (type === "link") { %>',
      '<Title><![CDATA[<%=title%>]]></Title>',
      '<Description><![CDATA[<%=description%>]]></Description>',
      '<Url><![CDATA[<%=url%>]]></Url>',
    '<% } else if (type === "event") { %>',
      '<Event><![CDATA[<%=event%>]]></Event>',
    '<% if (event === "LOCATION") { %>',
      '<Latitude><%=latitude%></Latitude>',
      '<Longitude><%=longitude%></Longitude>',
      '<Precision><%=precision%></Precision>',
    '<% } %>',
    '<% if (event === "location_select") { %>',
      '<EventKey><![CDATA[6]]></EventKey>',
      '<SendLocationInfo>',
        '<Location_X><![CDATA[<%=xPos%>]]></Location_X>',
        '<Location_Y><![CDATA[<%=yPos%>]]></Location_Y>',
        '<Scale><![CDATA[16]]></Scale>',
        '<Label><![CDATA[<%=label%>]]></Label>',
        '<Poiname><![CDATA[]]></Poiname>',
        '<EventKey><![CDATA[<%=eventKey%>]]></EventKey>',
      '</SendLocationInfo>',
    '<% } %>',
    '<% if (event === "pic_weixin") { %>',
      '<EventKey><![CDATA[someKey]]></EventKey>',
      '<SendPicsInfo>',
        '<Count>1</Count>',
        '<PicList>',
          '<item>',
            '<PicMd5Sum><![CDATA[pic_md5]]></PicMd5Sum> ',
          '</item>',
        '</PicList>',
        '<EventKey><![CDATA[<%=eventKey%>]]></EventKey>',
      '</SendPicsInfo>',
    '<% } %>',
    '<% } %>',
    '<% if (user === "web") { %>',
      'webwx_msg_cli_ver_0x1',
    '<% } %>',
  '</xml>'
].join('');

exports.template2 = require('ejs').compile(tpl2);
