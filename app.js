// app.js
Array.includes=Array.prototype.includes||function(e){return-1!==this.indexOf(e)};
App({
  towxml:require('/towxml/index'),
  onLaunch: function () {
    // 展示本地存储能力
  },
  globalData: {
    userInfo: null
  }
})