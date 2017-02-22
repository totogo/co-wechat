微信企业号消息接口服务中间件
======

## co-wechat-corp 
This project is built based on [co-wechat](https://github.com/node-webot/co-wechat) and [wechat-enterprise](https://github.com/node-webot/wechat-enterprise) in order to develop Wechat Corporate Account (微信企业号) on [Koa](https://github.com/koajs/koa)

## 功能列表
- 自动回复（文本、图片、语音、视频、音乐、图文）
- 会话支持（创新功能）(not supported yet)

## Installation

```sh
$ npm install co-wechat-corp
```

## Use with koa

```js
var wechat = require('co-wechat-corp');
var config = {
  encodingAESKey: 'encodingAESKey',
  token: 'token',
  corpId: 'corpid'
};

app.use(wechat(config).middleware(function *() {
  // 微信输入信息都在this.weixin上
  var message = this.weixin;
  if (message.FromUserName === 'diaosi') {
    // 回复屌丝(普通回复)
    this.body = 'hehe';
  } else if (message.FromUserName === 'text') {
    //你也可以这样回复text类型的信息
    this.body = {
      content: 'text object',
      type: 'text'
    };
  } else if (message.FromUserName === 'hehe') {
    // 回复一段音乐
    this.body = {
      type: "music",
      content: {
        title: "来段音乐吧",
        description: "一无所有",
        musicUrl: "http://mp3.com/xx.mp3",
        hqMusicUrl: "http://mp3.com/xx.mp3"
      }
    };
  } else {
    // 回复高富帅(图文回复)
    this.body = [
      {
        title: '你来我家接我吧',
        description: '这是女神与高富帅之间的对话',
        picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
        url: 'http://nodeapi.cloudfoundry.com/'
      }
    ];
  }
}));
```
备注：token在微信平台的开发者中心申请

### 回复消息
当用户发送消息到微信企业号应用，自动回复一条消息。这条消息可以是文本、图片、语音、视频、音乐、图文。详见：[官方文档](http://qydev.weixin.qq.com/wiki/index.php?title=%E8%A2%AB%E5%8A%A8%E5%93%8D%E5%BA%94%E6%B6%88%E6%81%AF)

#### 回复文本
```js
this.body = 'Hello world!';
// 或者
this.body = {type: "text", content: 'Hello world!'};
```
#### 回复图片
```js
this.body = {
  type: "image",
  content: {
    mediaId: 'mediaId'
  }
};
```
#### 回复语音
```js
this.body = {
  type: "voice",
  content: {
    mediaId: 'mediaId'
  }
};
```
#### 回复视频
```js
this.body = {
  type: "video",
  content: {
    mediaId: 'mediaId',
    thumbMediaId: 'thumbMediaId'
  }
};
```
#### 回复音乐
```js
this.body = {
  title: "来段音乐吧",
  description: "一无所有",
  musicUrl: "http://mp3.com/xx.mp3",
  hqMusicUrl: "http://mp3.com/xx.mp3"
};
```
#### 回复图文
```js
this.body = [
  {
    title: '你来我家接我吧',
    description: '这是女神与高富帅之间的对话',
    picurl: 'http://nodeapi.cloudfoundry.com/qrcode.jpg',
    url: 'http://nodeapi.cloudfoundry.com/'
  }
];
```

#### 回复空串
```js
this.body = '';
```

#### 转发到客服接口 (not supported yet)
```js
this.body = {
  type: "customerService",
  kfAccount: "test1@test" //可选
};
```

### WXSession支持 (not supported yet)
由于公共平台应用的客户端实际上是微信，所以采用传统的Cookie来实现会话并不现实，为此中间件模块在openid的基础上添加了Session支持。一旦服务端启用了`koa-generic-session`中间件，在业务中就可以访问`this.wxsession`属性。这个属性与`this.session`行为类似。

```js
var session = require('koa-generic-session');
app.use(session());
app.use(wechat('some token').middleware(function *() {
  var info = this.weixin;
  if (info.Content === '=') {
    var exp = this.wxsession.text.join('');
    this.wxsession.text = '';
    this.body = exp;
  } else {
    this.wxsession.text = this.wxsession.text || [];
    this.wxsession.text.push(info.Content);
    this.body = '收到' + info.Content;
  }
}));
```

`this.wxsession`与`this.session`采用相同的存储引擎，这意味着如果采用redis作为存储，这样`wxsession`可以实现跨进程共享。

## 详细API
原始API文档请参见：[消息接口](http://qydev.weixin.qq.com/wiki/index.php?title=%E6%8E%A5%E6%94%B6%E6%99%AE%E9%80%9A%E6%B6%88%E6%81%AF)。

## License
The MIT license.
