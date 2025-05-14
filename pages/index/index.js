// pages/index/index.js
Page({
  data: {
    notes: [],
    loading: true
  },

  onLoad: function (options) {
    this.loadNotes();
  },

  onShow: function () {
    this.loadNotes();
  },

  // 加载所有笔记
  loadNotes: function () {
    const notes = wx.getStorageSync('notes') || [];
    this.setData({
      notes: notes.sort((a, b) => b.updateTime - a.updateTime),
      loading: false
    });
  },

  // 跳转到创建新笔记页面
  onNewNote: function () {
    wx.navigateTo({
      url: '/pages/edit/edit'
    });
  },

  // 跳转到笔记详情页面
  onViewNote: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 删除笔记
  onDeleteNote: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条笔记吗？',
      success: function (res) {
        if (res.confirm) {
          let notes = wx.getStorageSync('notes') || [];
          notes = notes.filter(note => note.id !== id);
          wx.setStorageSync('notes', notes);
          that.loadNotes();
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }
})