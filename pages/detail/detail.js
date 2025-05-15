// pages/detail/detail.js
Page({
  data: {
    id: '',
    note: null,
    loading: true,
    highlight: '',
    scrollPos: 0,
    scrollId: '',
    scrollIntoView: ''
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({
        id: options.id,
        highlight: options.highlight || '',
        scrollPos: parseInt(options.scrollPos) || 0,
        scrollId: options.highlight ? "highlight-" + Date.now() : ""
      });
      this.loadNoteDetail();
    } else {
      wx.showToast({ title: '笔记不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onShow: function () {
    if (this.data.id) {
      this.loadNoteDetail();
    }
  },

  loadNoteDetail: function () {
    const notes = wx.getStorageSync('notes') || [];
    const note = notes.find(n => n.id === this.data.id);

    if (note) {
      const getTextLength = (html) => {
        if (!html) return 0;
        return html.replace(/<[^>]+>/g, '').length;
      };

      if (this.data.highlight && this.data.scrollId) {
        const regex = new RegExp(this.data.highlight, 'gi');
        note.content = note.content.replace(
          regex,
          '<span id="' + this.data.scrollId + '" class="highlight">$&</span>'
        );
      }

      note.wordCount = getTextLength(note.content);

      this.setData({
        note,
        loading: false
      }, () => {
        if (this.data.scrollPos > 0) {
          setTimeout(() => {
            this.setData({ scrollIntoView: this.data.scrollId });
          }, 300);
        }
      });
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: '笔记不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onEdit: function () {
    wx.navigateTo({
      url: "/pages/edit/edit?id=" + this.data.id
    });
  },

  onDelete: function () {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条笔记吗？',
      success: (res) => {
        if (res.confirm) {
          let notes = wx.getStorageSync('notes') || [];
          notes = notes.filter(note => note.id !== this.data.id);
          wx.setStorageSync('notes', notes);
          wx.showToast({ title: '删除成功', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        }
      }
    });
  },

  onShareAppMessage: function () {
    const note = this.data.note;
    return {
      title: note?.title || '我的笔记',
      path: "/pages/detail/detail?id=" + note?.id
    };
  }
});