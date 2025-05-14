// pages/edit/edit.js
Page({
  data: {
    id: '',
    title: '',
    content: '',
    isEdit: false,
    autoSaveTimer: null,
    editorCtx: null,
    formats: {},
    fontSize: 'normal',
    showColorPicker: false,
    colors: ['#ffffff', '#f8bbd0', '#e1f5fe', '#f1f8e9', '#fff8e1', '#efebe9'],
    wordCount: 0, // 内容字数统计
    canUndo: false, // 是否可以撤销
    canRedo: false  // 是否可以重做
  },

  onLoad: function (options) {
    // 如果传入了id，说明是编辑现有笔记
    if (options.id) {
      const notes = wx.getStorageSync('notes') || [];
      const note = notes.find(n => n.id === options.id);
      
      if (note) {
        this.setData({
          id: note.id,
          title: note.title,
          content: note.content,
          isEdit: true
        });
        
        wx.setNavigationBarTitle({
          title: '编辑笔记'
        });
      }
    } else {
      wx.setNavigationBarTitle({
        title: '新建笔记'
      });
    }

    // 设置自动保存定时器
    this.setData({
      autoSaveTimer: setInterval(() => {
        this.autoSave();
      }, 10000) // 每10秒自动保存一次
    });
  },

  onUnload: function () {
    // 页面卸载时清除定时器
    if (this.data.autoSaveTimer) {
      clearInterval(this.data.autoSaveTimer);
    }
  },

  // 编辑器初始化完成时触发
  onEditorReady: function() {
    const that = this;
    wx.createSelectorQuery().select('#editor').context(function (res) {
      that.setData({
        editorCtx: res.context
      });
      
      // 如果是编辑模式，设置编辑器内容
      if (that.data.isEdit && that.data.content) {
        // 判断内容是否为HTML格式
        if (that.data.content.indexOf('<') !== -1 && that.data.content.indexOf('>') !== -1) {
          that.data.editorCtx.setContents({
            html: that.data.content
          });
        } else {
          // 如果是纯文本，转换为HTML
          that.data.editorCtx.setContents({
            html: `<p>${that.data.content}</p>`
          });
        }
      }
    }).exec();
  },

  // 标题输入事件
  onTitleInput: function (e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 内容输入事件
  onContentInput: function (e) {
    // 编辑器的输入事件会返回HTML内容
    this.setData({
      content: e.detail.html || '',
      wordCount: this.getTextLength(e.detail.html || '')
    });
    
    // 更新撤销/重做状态
    this.updateUndoRedoStatus();
  },

  // 设置字体大小
  setFontSize: function(e) {
    const size = e.currentTarget.dataset.size;
    this.setData({
      fontSize: size
    });
    
    let fontSize;
    switch(size) {
      case 'small':
        fontSize = '14px';
        break;
      case 'large':
        fontSize = '18px';
        break;
      default:
        fontSize = '16px';
    }
    
    this.data.editorCtx.format('fontSize', fontSize);
  },

  // 显示颜色选择器
  showColorPicker: function() {
    this.setData({
      showColorPicker: !this.data.showColorPicker
    });
  },

  // 设置背景色
  setBackgroundColor: function(e) {
    const color = e.currentTarget.dataset.color;
    this.data.editorCtx.format('backgroundColor', color);
    this.setData({
      showColorPicker: false
    });
  },

  // 格式化功能
  format: function(e) {
    const { name, value } = e.currentTarget.dataset;
    if (!name) return;
    
    this.data.editorCtx.format(name, value);
    
    // 更新格式状态
    setTimeout(() => {
      this.data.editorCtx.getFormat().then(res => {
        this.setData({
          formats: res
        });
      });
    }, 100);
  },

  // 自动保存
  autoSave: function () {
    if (this.data.title || this.data.content) {
      this.saveNote(true);
    }
  },

  // 保存笔记
  saveNote: function (isAutoSave = false) {
    const title = this.data.title;
    const content = this.data.content;
    
    // 如果标题和内容都为空，不保存
    if (!title && !content) {
      if (!isAutoSave) {
        wx.showToast({
          title: '笔记内容不能为空',
          icon: 'none'
        });
      }
      return;
    }
    
    const now = new Date();
    const notes = wx.getStorageSync('notes') || [];
    
    // 格式化时间
    const updateTimeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (this.data.isEdit) {
      // 编辑现有笔记
      const index = notes.findIndex(n => n.id === this.data.id);
      if (index !== -1) {
        notes[index] = {
          ...notes[index],
          title,
          content,
          updateTime: now.getTime(),
          updateTimeStr
        };
      }
    } else {
      // 创建新笔记
      const newNote = {
        id: Date.now().toString(),
        title,
        content,
        createTime: now.getTime(),
        updateTime: now.getTime(),
        updateTimeStr
      };
      notes.unshift(newNote);
      
      // 更新页面数据，使其变为编辑模式
      this.setData({
        id: newNote.id,
        isEdit: true
      });
    }
    
    wx.setStorageSync('notes', notes);
    
    if (!isAutoSave) {
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } else {
      console.log('自动保存成功');
    }
  },

  // 保存按钮点击事件
  onSave: function () {
    this.saveNote();
  },

  // 更新撤销/重做状态
  updateUndoRedoStatus: function() {
    if (!this.data.editorCtx) return;
    
    this.data.editorCtx.canUndo().then(res => {
      this.setData({ canUndo: res });
    });
    this.data.editorCtx.canRedo().then(res => {
      this.setData({ canRedo: res });
    });
  },

  // 撤销操作
  undo: function() {
    if (!this.data.editorCtx) return;
    
    this.data.editorCtx.undo();
    this.updateUndoRedoStatus();
  },

  // 重做操作
  redo: function() {
    if (!this.data.editorCtx) return;
    
    this.data.editorCtx.redo();
    this.updateUndoRedoStatus();
  },

  // 计算纯文本长度（去除HTML标签）
  getTextLength: function(html) {
    if (!html) return 0;
    // 简单去除HTML标签
    const text = html.replace(/<[^>]+>/g, '');
    return text.length;
  },

  // 页面卸载时自动保存
  onUnload: function() {
    if (this.data.title || this.data.content) {
      this.saveNote(true);
    }
    
    // 清除定时器
    if (this.data.autoSaveTimer) {
      clearInterval(this.data.autoSaveTimer);
    }
  }
})