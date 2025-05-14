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
    
    // 处理笔记内容，将HTML转为纯文本用于预览
    const processedNotes = notes.map(note => {
      let contentText = note.content || '';
      
      // 如果内容是HTML格式，转换为纯文本
      if (contentText.indexOf('<') !== -1 && contentText.indexOf('>') !== -1) {
        // 简单的HTML标签移除
        contentText = contentText.replace(/<[^>]+>/g, '');
        // 处理HTML实体
        contentText = contentText.replace(/&nbsp;/g, ' ');
        contentText = contentText.replace(/&lt;/g, '<');
        contentText = contentText.replace(/&gt;/g, '>');
        contentText = contentText.replace(/&amp;/g, '&');
      }
      
      // 限制预览文本长度
      if (contentText.length > 100) {
        contentText = contentText.substring(0, 100) + '...';
      }
      
      return {
        ...note,
        contentText
      };
    });
    
    this.setData({
      notes: processedNotes.sort((a, b) => b.updateTime - a.updateTime),
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