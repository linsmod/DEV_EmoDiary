// pages/detail/detail.js
Page({
  data: {
    id: '',
    note: null,
    loading: true,
    highlight: '',
    targetLine: 0,
    scrollId: '',
    scrollIntoView: ''
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({
        id: options.id,
        highlight: options.highlight || '',
        targetLine: parseInt(options.line) || 0,
        scrollId: options.highlight ? "highlight-" + Date.now() : ""
      });
      this.loadNoteDetail();
    } else {
      wx.showToast({ title: '笔记不存在', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onReady: function () {
    if (this.data.targetLine > 0) {
      setTimeout(() => {
        const query = wx.createSelectorQuery();
        query.select(`#line-${this.data.targetLine}`).boundingClientRect();
        query.exec(res => {
          if (res[0]) {
            wx.pageScrollTo({
              scrollTop: res[0].top - 50,
              duration: 300
            });
          }
        });
      }, 500);
    }
  },

  loadNoteDetail: function () {
    const notes = wx.getStorageSync('notes') || [];
    const note = notes.find(n => n.id === this.data.id);

    if (note) {
      const getTextLength = (html) => {
        return html ? html.replace(/<[^>]+>/g, '').length : 0;
      };

      // 处理内容为行数组
      let lines = note.content.split('\n').map(line => {
        // 每行转换为rich-text支持的简单格式
        return [{
          name: 'div',
          attrs: { class: 'line-content' },
          children: [{ type: 'text', text: line }]
        }];
      });

      // 处理高亮
      if (this.data.highlight && this.data.scrollId) {
        const regex = new RegExp(this.data.highlight, 'gi');
        lines = lines.map(lineNodes => {
          const lineText = lineNodes[0].children[0].text;
          const highlighted = lineText.replace(regex,
            `<span class="highlight">$&</span>`);
          return [{
            name: 'div',
            attrs: { class: 'line-content' },
            children: [{ type: 'html', text: highlighted }]
          }];
        });
      }

      note.wordCount = getTextLength(note.content);
      note.lines = lines;

      this.setData({
        note,
        loading: false
      }, () => {
        if (this.data.scrollId) {
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