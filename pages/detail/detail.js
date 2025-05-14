// pages/detail/detail.js
Page({
  data: {
    id: '',
    note: null,
    loading: true
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({
        id: options.id
      });
      this.loadNoteDetail();
    } else {
      wx.showToast({
        title: '笔记不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onShow: function () {
    // 页面显示时重新加载笔记，以便在编辑后更新内容
    if (this.data.id) {
      this.loadNoteDetail();
    }
  },

  // 加载笔记详情
  loadNoteDetail: function () {
    const notes = wx.getStorageSync('notes') || [];
    const note = notes.find(n => n.id === this.data.id);
    
    if (note) {
      // 计算纯文本字数
      const getTextLength = (html) => {
        if (!html) return 0;
        const text = html.replace(/<[^>]+>/g, '');
        return text.length;
      };
      
      note.wordCount = getTextLength(note.content);
      
      this.setData({
        note,
        loading: false
      });
    } else {
      this.setData({
        loading: false
      });
      wx.showToast({
        title: '笔记不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 编辑笔记
  onEdit: function () {
    wx.navigateTo({
      url: `/pages/edit/edit?id=${this.data.id}`
    });
  },

  // 删除笔记
  onDelete: function () {
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条笔记吗？',
      success: function (res) {
        if (res.confirm) {
          let notes = wx.getStorageSync('notes') || [];
          notes = notes.filter(note => note.id !== that.data.id);
          wx.setStorageSync('notes', notes);
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 1000);
        }
      }
    });
  },

  // 分享功能
  onShareAppMessage: function () {
    const note = this.data.note;
    return {
      title: note.title || '我的笔记',
      path: `/pages/detail/detail?id=${note.id}`
    };
  }
})